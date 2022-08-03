const grpc = require("@grpc/grpc-js");
const proto_services = require("./proto/proto-service-loader");
const Constants = require("../utils/constants");

const AppendEntriesService = proto_services.AppendEntriesService;

function getClients() {
    const clientArray = [];
    Constants.PEER_IDS.forEach((peer_id) => {
        clientArray.push(new AppendEntriesService(
            `${peer_id}:${Constants.RPC_SERVER_PORT}`,
            grpc.credentials.createInsecure()
        ));
    });
    return clientArray;
}

module.exports = getClients();