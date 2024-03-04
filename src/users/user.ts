import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());
  let lastMessageReceived: null = null;
  let lastMessageSent: null = null;

  _user.get("/status", (req, res) => {
    res.status(200).send("live");
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.status(200).json({ "result": lastMessageReceived });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.status(200).json({ "result": lastMessageSent });
  });

  _user.post("/message", async (req, res) => {
    const message = req.body.message;
    lastMessageReceived = message;
    console.log(`User ${userId} received message: ${message}`)
    res.status(200).send("success");
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
