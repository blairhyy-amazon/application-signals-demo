import { StackProps, Stack, CfnOutput, Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

interface RdsDatabaseStackProps extends StackProps {
    readonly vpc: ec2.Vpc;
    readonly rdsSecurityGroup: ec2.SecurityGroup;
    readonly ecsTaskRole: iam.Role;
}

export class RdsDatabaseStack extends Stack {
    private readonly vpc: ec2.Vpc;
    private readonly DB_INSTANCE_IDENTIFIER: string = 'petclinic-python';
    public readonly rdsInstance: rds.DatabaseInstance;

    constructor(scope: Construct, id: string, props: RdsDatabaseStackProps) {
        super(scope, id, props);

        this.vpc = props.vpc;

        // Create DB Subnet Group
        const dbSubnetGroup = new rds.SubnetGroup(this, 'MyDBSubnetGroup', {
            vpc: this.vpc,
            description: 'Subnet group for RDS',
            subnetGroupName: 'my-db-subnet-group',
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Ensure private subnets with NAT are used
            },
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // Create a Secret for the database credentials
        const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
            secretName: 'PetClinicDBCredentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'root' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                includeSpace: false,
            },
        });

        // Create database instance
        this.rdsInstance = new rds.DatabaseInstance(this, 'MyDatabase', {
            vpc: this.vpc,
            credentials: rds.Credentials.fromSecret(dbSecret),
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Ensure private subnets with NAT are used
            },
            publiclyAccessible: false,
            instanceIdentifier: this.DB_INSTANCE_IDENTIFIER,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // db.t3.micro
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14,
            }),
            allocatedStorage: 20, // 20 GB allocated storage
            maxAllocatedStorage: 25,
            storageType: rds.StorageType.GP2,
            subnetGroup: dbSubnetGroup,
            securityGroups: [props.rdsSecurityGroup],
            multiAz: false, // Disable Multi-AZ
            backupRetention: Duration.days(0), // 0 days backup retention
            removalPolicy: RemovalPolicy.DESTROY, // For dev/testing environments
            deletionProtection: false, // Disable deletion protection
            deleteAutomatedBackups: true,
        });

        Tags.of(this.rdsInstance).add('Name', this.DB_INSTANCE_IDENTIFIER);

        dbSecret.grantRead(props.ecsTaskRole);
        dbSecret.grantWrite(props.ecsTaskRole);

        // Output the subnet group name
        new CfnOutput(this, 'DBSubnetGroupName', {
            value: dbSubnetGroup.subnetGroupName,
        });
    }
}
