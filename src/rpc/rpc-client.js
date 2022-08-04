const grpc = require("@grpc/grpc-js");
const Constants = require("../utils/constants");
const RaftService = require("./proto/proto-loader");

function getClients() {
    const clients = {};
    Constants.PEER_IDS.forEach((peer_id) => {
        clients[peer_id] = new RaftService(
            `${peer_id}:${Constants.RPC_SERVER_PORT}`,
            grpc.credentials.createInsecure()
        );
    });
    return clients;
}

module.exports = getClients();