const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types'); // Fixed typo in 'mime-types'
const Redis = require('ioredis');

const Publisher = new Redis('');
const clientSecrete = new S3Client({
    region: '', // Add your AWS region
    credentials: {
        secretAccessKey: '', // Add your AWS secret access key
        accessKeyId: '', // Add your AWS access key ID
    },
});

const PROJECT_ID = process.env.PROJECT_ID;

function PublishLog(log) {
    Publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function start() {
    PublishLog('Script execution started.');
    console.log('Executing script.js');

    PublishLog('Build process started.');
    const outDirPath = path.join(__dirname, 'output');

    const p = exec(`cd ${outDirPath} && npm install && npm run build`);

    p.stdout.on('data', (data) => {
        console.log(data.toString());
        PublishLog(`Build log: ${data.toString()}`);
    });

    p.stderr?.on('data', (error) => {
        console.error(error.toString());
        PublishLog(`Build error: ${error.toString()}`);
    });

    p.on('close', async (code) => {
        PublishLog('Build process completed.');
        console.log('Build Complete');

        const distFolderPath = path.join(__dirname, 'output', 'dist');
        let distFolderContent;

        try {
            PublishLog('Reading output directory contents.');
            distFolderContent = fs.readdirSync(distFolderPath, { withFileTypes: true });
        } catch (readError) {
            PublishLog(`Error reading output directory: ${readError.message}`);
            console.error('Error reading output directory:', readError);
            return;
        }

        PublishLog('Starting upload process.');
        for (const file of distFolderContent) {
            const filePath = path.join(distFolderPath, file.name);
            if (file.isDirectory()) {
                PublishLog(`Skipping directory: ${file.name}`);
                continue;
            }

            const command = new PutObjectCommand({
                Bucket: '', // Add your S3 bucket name
                Key: `_outputs/${PROJECT_ID}/${file.name}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath) || 'application/octet-stream',
            });

            try {
                await clientSecrete.send(command);
                PublishLog(`File uploaded: ${file.name}`);
                console.log('Uploaded:', file.name);
            } catch (uploadError) {
                PublishLog(`Upload error for ${file.name}: ${uploadError.message}`);
                console.error('Upload error for', file.name, uploadError);
            }
        }
        PublishLog('Upload process completed.');
    });
}

start().catch((err) => {
    PublishLog(`Script execution failed: ${err.message}`);
    console.error('Error during script execution:', err);
});
