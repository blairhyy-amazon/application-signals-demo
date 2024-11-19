
import {Stack, StackProps, CfnOutput} from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from "aws-cdk-lib/aws-iam";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";

import {LogGroup} from "aws-cdk-lib/aws-logs";

interface EcsClusterStackProps extends StackProps{
    readonly vpc: ec2.Vpc;
    readonly securityGroups: ec2.SecurityGroup[];
    readonly ecsTaskRole: iam.Role;
    readonly ecsTaskExecutionRole: iam.Role;
    readonly subnets: ec2.ISubnet[];
    readonly ecrImagePrefix: string;
}

interface CreateServiceProps {
    readonly serviceName: string;
    readonly taskDefinition: ecs.TaskDefinition;
    readonly DNSService: servicediscovery.Service;
}

export class EcsClusterStack extends Stack {
    public readonly cluster: ecs.Cluster;
    private readonly securityGroups: ec2.SecurityGroup[];
    private readonly ecsTaskRole: iam.Role;
    private readonly ecsTaskExecutionRole: iam.Role;
    private readonly subnets: ec2.ISubnet[];
    private readonly ecrImagePrefix: string;
    private CLUSTER_NAME = 'ecs-pet-clinic-demo';

    constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id, props);

        this.cluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc: props.vpc,
            clusterName: this.CLUSTER_NAME,
        });

        this.securityGroups = props.securityGroups;
        this.ecsTaskRole = props.ecsTaskRole;
        this.ecsTaskExecutionRole = props.ecsTaskExecutionRole;
        this.subnets = props.subnets;
        this.ecrImagePrefix = props.ecrImagePrefix;

        new CfnOutput(this, 'EcsClusterArn', {value: this.cluster.clusterArn});
    }

    createService(props: CreateServiceProps){
        const ecsService = new ecs.FargateService(this, `${props.serviceName}-ecs-service`, {
            serviceName: props.serviceName,
            taskDefinition: props.taskDefinition,
            cluster: this.cluster,
            securityGroups: this.securityGroups,
            vpcSubnets: {
                subnets: this.subnets
            },
            assignPublicIp: true,
        });

        ecsService.associateCloudMapService({
            service: props.DNSService
        })

        new CfnOutput(this, 'ecsService', {value: ecsService.serviceName})
        console.log(`Ecs Service - ${props.serviceName} is created`)
    }

    createConfigTaskDefinition(logGroup: LogGroup){
        const CONFIG_SERVER = 'pet-clinic-config-server';

        const taskDefinition = new ecs.TaskDefinition(this, `${CONFIG_SERVER}-task`, {
            cpu: '256',
            memoryMiB:  '512',
            compatibility: ecs.Compatibility.FARGATE,
            family: CONFIG_SERVER,
            networkMode: ecs.NetworkMode.AWS_VPC,
            taskRole: this.ecsTaskRole,
            executionRole: this.ecsTaskExecutionRole
        });

        // Add Container to Task Definition
        const container = taskDefinition.addContainer( `${CONFIG_SERVER}-container`, {
            image: ecs.ContainerImage.fromRegistry(`${this.ecrImagePrefix}/springcommunity/spring-petclinic-config-server`),
            cpu: 256,
            memoryLimitMiB: 512,
            essential: true,
            environment: {
                'SPRING_PROFILES_ACTIVE': 'ecs'
            },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'ecs',
                logGroup: logGroup,
            })
        });

        // Add Port Mapping
        container.addPortMappings({
            containerPort: 8888,
            protocol: ecs.Protocol.TCP
        });

        return taskDefinition;
    }
}