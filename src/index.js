const grpc = require("@grpc/grpc-js");
const rest_server = require("./key-value-map/rest-server");
const rpc_server = require("./rpc/rpc-server");
const rpc_client = require("./rpc/rpc-client");
const Constants = require("./utils/constants");

rest_server.listen(Constants.REST_SERVER_PORT, () => {
    console.log(`REST Service listening on port ${Constants.REST_SERVER_PORT}`);
});

const mockReqData = {
    term: 1,
    leaderId: Constants.LEADER_ID,
    prevLogIndex: 3,
    prevLogTerm: 4,
    entries: [{
        index: 1,
        term: 1,
        command: "POST:x:2"
    }],
    leaderCommit: 1
};


rpc_server.bindAsync(
    `0.0.0.0:${Constants.RPC_SERVER_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    async () => {
        console.log(`RPC Service running at port ${Constants.RPC_SERVER_PORT}`);
        await rpc_server.start();
        if (Constants.LEADER_ID === 'node-3') {
            rpc_client.forEach((client) => {
                client.postAppendEntry(mockReqData, (error, result) => {
                    if (error) console.log(error)
                    console.log(result);
                });
            });
        }
    }
);