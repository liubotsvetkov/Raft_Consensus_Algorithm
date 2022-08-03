const grpc = require("@grpc/grpc-js");
const Constants = require("../utils/constants");
const RaftService = require("./proto/proto-loader");

function getClients() {
    const clientArray = [];
    Constants.PEER_IDS.forEach((peer_id) => {
        clientArray.push(new RaftService(
            `${peer_id}:${Constants.RPC_SERVER_PORT}`,
            grpc.credentials.createInsecure()
        ));
    });
    return clientArray;
}

module.exports = getClients();