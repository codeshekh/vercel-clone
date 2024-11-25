const express = require('express');
const app = express();
const HTTP_PROXY = require('http-proxy');
const PORT= 8000;
const BASE_PATH = "";

const proxy = HTTP_PROXY.createProxy();

app.use((req,res)=>{
const hostname = req.hostname;
const subdomain = hostname.split('.')[0];
const resolve = `${BASE_PATH}/${subdomain}`;
proxy.web(req,res, {target: resolve, changeOrigin: true});

})

proxy.on('proxyReq', (proxyReq, req,res)=>{
    const url = req.url;
    if(url==='/'){
        proxyReq += 'index.html';
    }
    
})

app.listen(PORT, ()=>{
    console.log(`Reverse Proxy is Running on ${PORT}`);
})