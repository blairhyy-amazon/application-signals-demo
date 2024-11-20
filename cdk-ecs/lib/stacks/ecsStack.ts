import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";

import { ServiceDiscoveryStack } from "./servicediscoveryStack";
import { LogStack } from "./logStack";

interface EcsClusterStackProps extends StackProps {
  readonly vpc: ec2.Vpc;
  readonly securityGroups: ec2.SecurityGroup[];
  readonly ecsTaskRole: iam.Role;
  readonly ecsTaskExecutionRole: iam.Role;
  readonly subnets: ec2.ISubnet[];
  readonly ecrImagePrefix: string;
  readonly serviceDiscoveryStack: ServiceDiscoveryStack;
  readonly logStack: LogStack;
}

interface CreateServiceProps {
  readonly serviceName: string;
  readonly taskDefinition: ecs.TaskDefinition;
}

export class EcsClusterStack extends Stack {
  public readonly cluster: ecs.Cluster;
  private readonly securityGroups: ec2.SecurityGroup[];
  private readonly ecsTaskRole: iam.Role;
  private readonly ecsTaskExecutionRole: iam.Role;
  private readonly subnets: ec2.ISubnet[];
  private readonly ecrImagePrefix: string;
  private readonly serviceDiscoveryStack: ServiceDiscoveryStack;
  private readonly logStack: LogStack;
  private readonly CLUSTER_NAME = "ecs-pet-clinic-demo";
  private readonly CONFIG_SERVER = "pet-clinic-config-server";
  private readonly DISCOVERY_SERVER = "pet-clinic-discovery-server";
  private readonly ADMIN_SERVER = "pet-clinic-admin-server";

  constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    this.cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc: props.vpc,
      clusterName: this.CLUSTER_NAME,
    });

    this.securityGroups = props.securityGroups;
    this.ecsTaskRole = props.ecsTaskRole;
    this.ecsTaskExecutionRole = props.ecsTaskExecutionRole;
    this.subnets = props.subnets;
    this.ecrImagePrefix = props.ecrImagePrefix;
    this.serviceDiscoveryStack = props.serviceDiscoveryStack;
    this.logStack = props.logStack;

    new CfnOutput(this, "EcsClusterArn", { value: this.cluster.clusterArn });
  }

  createService(props: CreateServiceProps) {
    // 1. create service discovery service
    const DNSService = this.serviceDiscoveryStack.createService(
      props.serviceName,
    );

    // 2, create ECS service
    const ecsService = new ecs.FargateService(
      this,
      `${props.serviceName}-ecs-service`,
      {
        serviceName: props.serviceName,
        taskDefinition: props.taskDefinition,
        cluster: this.cluster,
        securityGroups: this.securityGroups,
        vpcSubnets: {
          subnets: this.subnets,
        },
        assignPublicIp: true,
      },
    );

    ecsService.associateCloudMapService({
      service: DNSService,
    });

    new CfnOutput(this, `ecsService-${props.serviceName}`, {
      value: ecsService.serviceName,
    });
    console.log(`Ecs Service - ${props.serviceName} is created`);
  }

  createConfigServer() {
    // Create a log group
    const configLogGroup = this.logStack.createLogGroup(this.CONFIG_SERVER);

    // Create ECS task definition
    const taskDefinition = new ecs.TaskDefinition(
      this,
      `${this.CONFIG_SERVER}-task`,
      {
        cpu: "256",
        memoryMiB: "512",
        compatibility: ecs.Compatibility.FARGATE,
        family: this.CONFIG_SERVER,
        networkMode: ecs.NetworkMode.AWS_VPC,
        taskRole: this.ecsTaskRole,
        executionRole: this.ecsTaskExecutionRole,
      },
    );

    // Add Container to Task Definition
    const container = taskDefinition.addContainer(
      `${this.CONFIG_SERVER}-container`,
      {
        image: ecs.ContainerImage.fromRegistry(
          `${this.ecrImagePrefix}/springcommunity/spring-petclinic-config-server`,
        ),
        cpu: 256,
        memoryLimitMiB: 512,
        essential: true,
        environment: {
          SPRING_PROFILES_ACTIVE: "ecs",
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: "ecs",
          logGroup: configLogGroup,
        }),
      },
    );

    // Add Port Mapping
    container.addPortMappings({
      containerPort: 8888,
      protocol: ecs.Protocol.TCP,
    });

    // Create ECS service
    this.createService({
      serviceName: this.CONFIG_SERVER,
      taskDefinition: taskDefinition,
    });
  }

  createDiscoveryServer() {
    // Create a log group
    const discoveryLogGroup = this.logStack.createLogGroup(
      this.DISCOVERY_SERVER,
    );

    // Create ECS task definition
    const taskDefinition = new ecs.TaskDefinition(
      this,
      `${this.DISCOVERY_SERVER}-task`,
      {
        cpu: "256",
        memoryMiB: "512",
        compatibility: ecs.Compatibility.FARGATE,
        family: this.DISCOVERY_SERVER,
        networkMode: ecs.NetworkMode.AWS_VPC,
        taskRole: this.ecsTaskRole,
        executionRole: this.ecsTaskExecutionRole,
      },
    );

    // Add Container to Task Definition
    const container = taskDefinition.addContainer(
      `${this.DISCOVERY_SERVER}-container`,
      {
        image: ecs.ContainerImage.fromRegistry(
          `${this.ecrImagePrefix}/springcommunity/spring-petclinic-discovery-server`,
        ),
        cpu: 256,
        memoryLimitMiB: 512,
        essential: true,
        environment: {
          SPRING_PROFILES_ACTIVE: "ecs",
          CONFIG_SERVER_URL: `http://${this.CONFIG_SERVER}-DNS.${this.serviceDiscoveryStack.namespace.namespaceName}:8888`,
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: "ecs",
          logGroup: discoveryLogGroup,
        }),
      },
    );

    // Add Port Mapping
    container.addPortMappings({
      containerPort: 8761,
      protocol: ecs.Protocol.TCP,
    });

    // Create ECS service
    this.createService({
      serviceName: this.DISCOVERY_SERVER,
      taskDefinition: taskDefinition,
    });
  }

  createAdminServer() {
    // Create a log group
    const adminLogGroup = this.logStack.createLogGroup(this.ADMIN_SERVER);

    // Create ECS task definition
    const taskDefinition = new ecs.TaskDefinition(
      this,
      `${this.ADMIN_SERVER}-task`,
      {
        cpu: "256",
        memoryMiB: "512",
        compatibility: ecs.Compatibility.FARGATE,
        family: this.ADMIN_SERVER,
        networkMode: ecs.NetworkMode.AWS_VPC,
        taskRole: this.ecsTaskRole,
        executionRole: this.ecsTaskExecutionRole,
      },
    );

    // Add Container to Task Definition
    const container = taskDefinition.addContainer(
      `${this.ADMIN_SERVER}-container`,
      {
        image: ecs.ContainerImage.fromRegistry(
          `${this.ecrImagePrefix}/springcommunity/spring-petclinic-admin-server`,
        ),
        cpu: 256,
        memoryLimitMiB: 512,
        essential: true,
        environment: {
          SPRING_PROFILES_ACTIVE: "ecs",
          CONFIG_SERVER_URL: `http://${this.CONFIG_SERVER}-DNS.${this.serviceDiscoveryStack.namespace.namespaceName}:8888`,
          DISCOVERY_SERVER_URL: `http://${this.DISCOVERY_SERVER}-DNS.${this.serviceDiscoveryStack.namespace.namespaceName}:8761/eureka`,
          ADMIN_IP: `${this.ADMIN_SERVER}-DNS.${this.serviceDiscoveryStack.namespace.namespaceName}`,
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: "ecs",
          logGroup: adminLogGroup,
        }),
      },
    );

    // Add Port Mapping
    container.addPortMappings({
      containerPort: 9090,
      protocol: ecs.Protocol.TCP,
    });

    // Create ECS service
    this.createService({
      serviceName: this.ADMIN_SERVER,
      taskDefinition: taskDefinition,
    });
  }
}
