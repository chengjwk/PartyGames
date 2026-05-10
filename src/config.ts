// PartyKit host. In dev, point at the LAN IP/hostname so phones can connect
// to the same dev box that's serving the Vite frontend.
export const PARTY_HOST: string = import.meta.env.DEV
  ? `${window.location.hostname}:1999`
  : (import.meta.env.VITE_PARTY_HOST as string);
