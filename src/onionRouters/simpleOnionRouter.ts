import bodyParser, { raw } from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import axios from "axios";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, importPubKey, importPrvKey, rsaDecrypt, rsaEncrypt, createRandomSymmetricKey, exportSymKey, importSymKey, symDecrypt, symEncrypt } from "../crypto";


export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());
  let encryptedMessages: string | null = null;
  let decryptedMessages: string | null = null;
  let lastNodeID: number | null = null;
  const registryUrl = "http://localhost:8080";

  const {publicKey,privateKey} = await generateRsaKeyPair();
  let rawPublicKey = await exportPubKey(publicKey);
  let rawPrivateKey = await exportPrvKey(privateKey);

  const postData = {
    nodeId: nodeId,
    pubKey: rawPublicKey
  };

  try {
    const response = await axios.post(`${registryUrl}/registerNode`, postData);
    console.log('Server response:', response.data);
  } catch (error: any) {
    console.error('Error making POST request:', error.message);
  }

  onionRouter.get("/status", (req, res) => {
    res.status(200).send("live");
  });
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.status(200).json({"result" : encryptedMessages});
  });
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.status(200).json({"result" : decryptedMessages});
  });
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.status(200).json({"result" : lastNodeID});
  });

  onionRouter.get("/getPrivateKey", (req, res) => {
    res.status(200).send({ "result": rawPrivateKey });
  });

  

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
