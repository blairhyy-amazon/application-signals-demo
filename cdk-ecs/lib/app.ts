import * as cdk from 'aws-cdk-lib';
import * as assert from "assert";

import {getECRImagePrefix} from "./utils";
import {EcsClusterStack} from "./stacks/ecsStack";
import {IamRolesStack} from "./stacks/iamRolesStack";
import {NetworkStack} from "./stacks/networkStack";
import {ServiceDiscoveryStack} from "./stacks/servicediscoveryStack";
import {LogStack} from "./stacks/logStack";

class ApplicationSignalsECSDemo {
    private readonly app: cdk.App;
    private ecrImagePrefix: string;
    private ecsClusterStack: EcsClusterStack;
    private serviceDiscoveryStack: ServiceDiscoveryStack;
    private logStack: LogStack;

    constructor() {
        this.app = new cdk.App();
        this.ecrImagePrefix = '';
        this.runApp()
    }

    public runApp(): void {
        const ECR_REGION = 'us-east-1';
        getECRImagePrefix(ECR_REGION)
            .then((prefix) => {
                this.ecrImagePrefix = prefix;
                assert(this.ecrImagePrefix !== "", "ECR Image Prefix is empty");
                this.createStacks();
                this.createServers();
                this.app.synth();
            })
            .catch((err) => console.error("Error:", err))
    }

    private createServers() {
        this.ecsClusterStack.createConfigServer();
        this.ecsClusterStack.createDiscoveryServer();
    }

    private createStacks(): void {
        const networkStack = new NetworkStack(this.app, 'NetworkStack');
        this.logStack = new LogStack(this.app, 'LogStack');
        const iamRolesStack = new IamRolesStack(this.app, 'IamRolesStack');

        this.serviceDiscoveryStack = new ServiceDiscoveryStack(this.app, 'ServiceDiscoveryStack', {
            vpc: networkStack.vpc,
        });

        this.ecsClusterStack = new EcsClusterStack(this.app, 'EcsClusterStack', {
            vpc: networkStack.vpc,
            securityGroups: [networkStack.securityGroup],
            ecsTaskRole: iamRolesStack.ecsTaskRole,
            ecsTaskExecutionRole: iamRolesStack.ecsTaskExecutionRole,
            subnets: networkStack.vpc.publicSubnets,
            ecrImagePrefix: this.ecrImagePrefix,
            serviceDiscoveryStack: this.serviceDiscoveryStack,
            logStack: this.logStack
        });
    }
}

new ApplicationSignalsECSDemo();
