import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IamRolesStack extends Stack {
    private readonly ECS_TASK_ROLE_NAME = 'ecs-pet-clinic-task-role';
    private readonly ECS_TASK_EXECUTION_ROLE_NAME = 'ecs-pet-clinic-task-execution-role';
    public readonly ecsTaskRole: iam.Role;
    public readonly ecsTaskExecutionRole: iam.Role;
    public readonly databaseAccessRole: iam.Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create IAM Roles for ECS Task
        this.ecsTaskRole = new iam.Role(this, 'EcsTaskRole', {
            roleName: this.ECS_TASK_ROLE_NAME,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        const taskRolePolicies: string[] = [
            'AWSXrayWriteOnlyAccess',
            'CloudWatchAgentServerPolicy',
            'service-role/AmazonEC2ContainerServiceRole',
            'AmazonECS_FullAccess',
            'AmazonSQSFullAccess',
            'AmazonDynamoDBFullAccess',
            'AmazonRDSFullAccess',
            'AmazonS3FullAccess',
            'AmazonBedrockFullAccess',
            'AmazonKinesisFullAccess',
        ];

        taskRolePolicies.forEach((policy) => {
            this.ecsTaskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(policy));
        });

        // Create IAM Roles for ECS Task Execution
        this.ecsTaskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
            roleName: this.ECS_TASK_EXECUTION_ROLE_NAME,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        const taskExecutionRolePolicies = [
            'CloudWatchAgentServerPolicy',
            'service-role/AmazonECSTaskExecutionRolePolicy',
        ];

        taskExecutionRolePolicies.forEach((policy) => {
            this.ecsTaskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(policy));
        });

        new CfnOutput(this, 'TaskRoleArn', { value: this.ecsTaskRole.roleArn });
        new CfnOutput(this, 'TaskExecutionRoleArn', {
            value: this.ecsTaskExecutionRole.roleArn,
        });
    }
}
