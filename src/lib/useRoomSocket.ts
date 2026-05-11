import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";
import type {
  ClientMessage,
  PrivatePlayerState,
  PublicGameState,
  ServerMessage,
} from "../shared/types";

export interface SubmitFeedback {
  word: string;
  ok: boolean;
  reason?: string;
  points?: number;
  isPangram?: boolean;
  firstFinder?: boolean;
  at: number;
}

export interface RoomSocket {
  state: PublicGameState | null;
  privateState: PrivatePlayerState | null;
  lastSubmit: SubmitFeedback | null;
  switchAt: number | null; // epoch ms when the server told us to navigate back to the lobby picker
  send: (msg: ClientMessage) => void;
}

export function useRoomSocket(
  roomCode: string,
  role: "host" | "player",
  party = "main", // "main" = wordhive; "mathhive" routes to the math party
): RoomSocket {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [lastSubmit, setLastSubmit] = useState<SubmitFeedback | null>(null);
  const [switchAt, setSwitchAt] = useState<number | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party,
      query: { role },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as ServerMessage;
      switch (msg.type) {
        case "state":
          setState(msg.state);
          break;
        case "private":
          setPrivateState(msg.private);
          break;
        case "submitResult":
          setLastSubmit({
            word: msg.word,
            ok: msg.ok,
            reason: msg.reason,
            points: msg.points,
            isPangram: msg.isPangram,
            firstFinder: msg.firstFinder,
            at: Date.now(),
          });
          break;
        case "switchGames":
          setSwitchAt(Date.now());
          break;
      }
    };
    socket.addEventListener("message", onMsg);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode, role, party]);

  const send = (msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };

  return { state, privateState, lastSubmit, switchAt, send };
}
