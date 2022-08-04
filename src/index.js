const grpc = require("@grpc/grpc-js");
const rest_server = require("./key-value-map/rest-server");
const rpc_server = require("./rpc/rpc-server");
const Constants = require("./utils/constants");
const election_timeout_util = require("./utils/election-timeout-util");

rest_server.listen(Constants.REST_SERVER_PORT, () => {
    console.log(`REST Service listening on port ${Constants.REST_SERVER_PORT}`);
});

rpc_server.bindAsync(
    `0.0.0.0:${Constants.RPC_SERVER_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    async () => {
        console.log(`RPC Service running at port ${Constants.RPC_SERVER_PORT}`);
        rpc_server.start();
        election_timeout_util.startTimer();
    }
);