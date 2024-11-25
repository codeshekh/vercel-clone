const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');

const app = express();
const PORT = 9000;
const {} = require('socket-io')
const Redish = require('ioredis')

const subscriber = new Redish('');
const io = new Server({cors: '*'})

io.on('connection',socket=>{
    socket.on('subscribe',channel => {
        socket.join(channel);
        socket.emit('message', `joined ${channel}`);
    })
})
io.listen(9001, ()=>console.log('Socket  Server 9001'))
// Initialize ECS client
const ecsClient = new ECSClient({
    region: 'your-region', // Add your AWS region
    credentials: {
        accessKeyId: 'your-access-key-id', // Replace with your AWS access key
        secretAccessKey: 'your-secret-access-key', // Replace with your AWS secret key
    },
});

// Task configuration
const config = {
    Task: 'your-task-definition', // Replace with your ECS task definition
    CLUSTER: 'your-cluster-name', // Replace with your ECS cluster name
};

app.use(express.json());

// POST /project endpoint
app.post('/project', async (req, res) => {
    try {
        const { gitUrl } = req.body;
        if (!gitUrl) {
            return res.status(400).json({ error: 'gitUrl is required' });
        }

        
        const projectSlug = generateSlug();

        const taskCommand = new RunTaskCommand({
            cluster: config.CLUSTER,
            taskDefinition: config.Task,
            launchType: 'FARGATE',
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: ['your-subnet-id-1', 'your-subnet-id-2'], // Replace with your subnets
                    securityGroups: ['your-security-group-id'], // Replace with your security group
                    assignPublicIp: 'ENABLED',
                },
            },
            overrides: {
                containerOverrides: [
                    {
                        name: 'your-container-name', // Replace with your container name
                        environment: [
                            { name: 'GIT_REPOSITORY_URL', value: gitUrl },
                            { name: 'PROJECT_ID', value: projectSlug },
                        ],
                    },
                ],
            },
        });

        // Run ECS task
        const taskResponse = await ecsClient.send(taskCommand);

        // Send response to the client
        return res.json({
            status: 'queued',
            data: {
                projectSlug,
                url: `http://${projectSlug}.localhost:8000`,
                taskResponse,
            },
        });
    } catch (error) {
        console.error('Error running ECS task:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

async function InitRedishSubscriber(){
    console.log('Subscribe to Logs');
subscriber.psubscribe('logs:*')
subscriber.on('pmessage',(pattern, channel, message)=>{
    io.to(channel).emit('message', message);
})
}
InitRedishSubscriber()
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
