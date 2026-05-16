// Pre-game lobby. Players join via QR before the host has picked which game
// to play. Once the host picks, every client navigates to the chosen game's
// dedicated party (wordhive or mathhive) and auto-rejoins there with the
// same clientId / name / avatar (which live in localStorage on each phone).
//
// This party deliberately has no game state — just presence + the chosen
// game flag. Once the chosen game runs, the lobby room can be torn down or
// reused for a new room with the same code.

import type * as Party from "partykit/server";
import type { Player } from "../src/shared/types";

export type LobbyGame = "word" | "math" | "draw";

export interface LobbyState {
  players: Player[];
  hostPlayerId: string | null;
  chosenGame: LobbyGame | null;
}

export type LobbyClientMessage =
  | { type: "join"; name: string; avatar: string; clientId: string }
  | { type: "rename"; name: string }
  | { type: "setAvatar"; avatar: string }
  | { type: "pickGame"; game: LobbyGame }
  | { type: "resetChoice" }
  | { type: "transferHost"; playerId: string };

export type LobbyServerMessage =
  | { type: "you"; playerId: string }
  | { type: "state"; state: LobbyState }
  | { type: "error"; message: string };

export default class LobbyServer implements Party.Server {
  private players = new Map<string, Player>(); // by clientId
  private joinOrder: string[] = [];
  private connToClient = new Map<string, string>();
  private hostConns = new Set<string>(); // connections opened with role=host
  private hostPlayerId: string | null = null;
  private chosenGame: LobbyGame | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const role = new URL(ctx.request.url).searchParams.get("role") ?? "player";
    if (role === "host") this.hostConns.add(conn.id);
    this.send(conn, { type: "you", playerId: conn.id });
    this.send(conn, { type: "state", state: this.snapshot() });
  }

  onClose(conn: Party.Connection) {
    this.hostConns.delete(conn.id);
    const cid = this.connToClient.get(conn.id);
    if (!cid) return;
    this.connToClient.delete(conn.id);
    const stillHere = [...this.connToClient.values()].includes(cid);
    if (!stillHere) {
      const p = this.players.get(cid);
      if (p) p.connected = false;
      // Host is sticky — we do NOT auto-migrate when the host
      // disconnects. The host keeps the role even when offline so
      // they're still host on reconnect. To change host explicitly,
      // someone uses the `transferHost` message.
    }
    this.broadcastState();
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: LobbyClientMessage;
    try {
      msg = JSON.parse(raw) as LobbyClientMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg);
        return;
      case "rename":
        this.handleRename(sender, msg);
        return;
      case "setAvatar":
        this.handleSetAvatar(sender, msg);
        return;
      case "pickGame":
        if (this.isHost(sender) && !this.chosenGame) {
          this.chosenGame = msg.game;
          this.broadcastState();
        }
        return;
      case "resetChoice":
        // Anyone can ask to reset — used when navigating back from a game
        // to the picker (?reset=1 in the URL triggers this on connect).
        if (this.chosenGame !== null) {
          this.chosenGame = null;
          this.broadcastState();
        }
        return;
      case "transferHost":
        this.handleTransferHost(sender, msg);
        return;
    }
  }

  // Host transfer: the current host can hand off to anyone, and if
  // the current host is disconnected anyone can claim. Server enforces
  // both rules — clients shouldn't be trusted to gate themselves.
  private handleTransferHost(
    sender: Party.Connection,
    msg: { playerId: string },
  ) {
    const senderCid = this.connToClient.get(sender.id);
    if (!senderCid) return;
    const target = this.players.get(msg.playerId);
    if (!target) return;
    const currentHost = this.hostPlayerId
      ? this.players.get(this.hostPlayerId)
      : null;
    const hostConnected = !!currentHost?.connected;
    // If the current host is online, only the host can hand off.
    if (hostConnected && senderCid !== this.hostPlayerId) return;
    this.hostPlayerId = msg.playerId;
    this.broadcastState();
  }

  private handleJoin(
    sender: Party.Connection,
    msg: { name: string; avatar: string; clientId: string },
  ) {
    const name = (msg.name || "").trim().slice(0, 24);
    if (!name || !msg.clientId) {
      this.send(sender, { type: "error", message: "Name and clientId required." });
      return;
    }
    const existing = this.players.get(msg.clientId);
    if (existing) {
      existing.name = name;
      if (msg.avatar) existing.avatar = msg.avatar;
      existing.connected = true;
    } else {
      this.players.set(msg.clientId, {
        id: msg.clientId,
        name,
        avatar: msg.avatar || "fox",
        scoreMultiplier: 1,
        connected: true,
      });
      this.joinOrder.push(msg.clientId);
    }
    this.connToClient.set(sender.id, msg.clientId);
    // Host is sticky — only assign a host if there's no host yet, or
    // if the recorded host no longer has a player record (e.g.,
    // cleared by handleResetGame in a sibling party). We never bump
    // the host just because the current host is offline.
    if (!this.hostPlayerId || !this.players.get(this.hostPlayerId)) {
      this.hostPlayerId = this.electHost();
    }
    this.broadcastState();
  }

  private handleRename(sender: Party.Connection, msg: { name: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const p = this.players.get(cid);
    if (!p) return;
    const name = (msg.name || "").trim().slice(0, 24);
    if (!name) return;
    p.name = name;
    this.broadcastState();
  }

  private handleSetAvatar(sender: Party.Connection, msg: { avatar: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid || !msg.avatar) return;
    const p = this.players.get(cid);
    if (!p) return;
    p.avatar = msg.avatar;
    this.broadcastState();
  }

  private electHost(): string | null {
    for (const cid of this.joinOrder) {
      const p = this.players.get(cid);
      if (p?.connected) return cid;
    }
    return null;
  }

  private isHost(conn: Party.Connection): boolean {
    if (this.hostConns.has(conn.id)) return true;
    const cid = this.connToClient.get(conn.id);
    return !!cid && cid === this.hostPlayerId;
  }

  private snapshot(): LobbyState {
    return {
      players: [...this.players.values()],
      hostPlayerId: this.hostPlayerId,
      chosenGame: this.chosenGame,
    };
  }

  private broadcastState() {
    const msg: LobbyServerMessage = { type: "state", state: this.snapshot() };
    this.room.broadcast(JSON.stringify(msg));
  }

  private send(conn: Party.Connection, msg: LobbyServerMessage) {
    conn.send(JSON.stringify(msg));
  }
}

LobbyServer satisfies Party.Worker;
