import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import { GetNodeRegistryBody, Node } from "../registry/registry";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, importPubKey, importPrvKey, rsaDecrypt, rsaEncrypt, createRandomSymmetricKey, exportSymKey, importSymKey, symDecrypt, symEncrypt } from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());
  let lastMessageReceived: string | null = null;
  let lastMessageSent: string | null = null;
  let lastCircuit: Node[] = [];

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

  _user.get("/getLastCircuit", (req, res) => {
    res.status(200).json({result: lastCircuit.map((node) => node.nodeId)});
  });

  _user.post("/sendMessage", async (req, res) => {
    const {message,destinationUserId} = req.body;

    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)
        .then((res) => res.json() as Promise<GetNodeRegistryBody>)
        .then((body) => body.nodes);

    let randomCircuit : Node[] = [];
    for (let i = 0; i < 3; i++) {
      const newRandomeId = Math.floor(Math.random() * nodes.length);
      if (!randomCircuit.includes(nodes[newRandomeId])) {
        randomCircuit.push(nodes[newRandomeId]);
      }
    }

    let dest = "${BASE_USER_PORT + destinationUserId}".padStart(10, "0");
    let finalMessage = message;
    for(const node of randomCircuit) {
      const symKeys = await createRandomSymmetricKey();
      const rawSymKeys = await exportSymKey(symKeys);
      const encryptedMessage = await symEncrypt(symKeys, `${dest + finalMessage}`);

      dest = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, '0');
      const encryptedSymKey = await rsaEncrypt(rawSymKeys, node.pubKey);
      finalMessage = encryptedSymKey + encryptedMessage;
    }

    randomCircuit.reverse();
    lastCircuit = randomCircuit;
    lastMessageSent = message;
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + randomCircuit[0].nodeId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: finalMessage }),
    });
    res.status(200).send("success");
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
