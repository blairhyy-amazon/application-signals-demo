import * as cdk from 'aws-cdk-lib'
import {NetworkStack} from "./stacks/networkStack";
import {IamRolesStack} from "./stacks/iamRolesStack";
import {ServiceDiscoveryStack} from "./stacks/servicediscoveryStack";
import {EcsClusterStack} from "./stacks/ecsStack";

const app = new cdk.App();

const networkStack = new NetworkStack(app, 'NetworkStack');
const iamRolesStack = new IamRolesStack(app, 'IamRolesStack');
const serviceDiscoveryStack = new ServiceDiscoveryStack(app, 'ServiceDiscoveryStack', {
    vpc: networkStack.vpc,
});

// Once namespaceId in serviceDiscoveryStack is created, create ECS cluster
const ecsClusterStack = new EcsClusterStack(app, 'EcsClusterStack', {
    vpc: networkStack.vpc,
});


app.synth();