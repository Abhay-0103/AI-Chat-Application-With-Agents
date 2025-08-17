import { StreamChat } from "stream-chat";

export const apiKey = process.env.STREAM_API_KEY as string;
export const apiSecret = process.env.STREAM_API_SECRET as string;

if (!apiKey || !apiSecret) {
  throw new Error("Missing required env variables for STREAM_API_SECRET and STREAM_API_KEY");
}

export const serverClient = new StreamChat(apiKey, apiSecret);
