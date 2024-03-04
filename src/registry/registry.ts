import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};


export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  let nodeRegistry: Node[] = [];

  _registry.get("/status", (req, res) => {
    res.status(200).send("live");
  });

  _registry.post("/registerNode", async (req, res) => {
    const nodeToRegister: Node = {nodeId : req.body.nodeId, pubKey : req.body.pubKey};
    nodeRegistry.push(nodeToRegister);
    console.log(`Registering node ${nodeToRegister.nodeId}`);
    res.status(200).send({"message" : `Node ${nodeToRegister.nodeId} registered`});
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    const getNodes: GetNodeRegistryBody = {nodes : nodeRegistry};
    if (getNodes.nodes.length === 0) {
      res.status(404).json({ error: "No nodes registered" });
    }
    res.status(200).json(getNodes);
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
