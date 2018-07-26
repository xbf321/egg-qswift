'use strict';
const assert = require('assert');
const debug = require('debug')('qswift');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const mime = require('mime');
const fse = require('fs-extra');
const SwiftClient = require('./swiftClient.js');

class Upload {
    constructor(config, app) {
        this.config = config;
        assert(this.config.authUrl, 'should pass config.authUrl');
        assert(this.config.userName, 'should pass config.userName');
        assert(this.config.userPassword, 'should pass config.userPassword');
        this.app = app;
        this.localPath = path.join(app.baseDir, '.qswift');
        // 创建一个空目录
        fse.emptyDirSync(this.localPath);
        debug('qswift#config', this.config);
    }
    getContainer(mimeType) {
        // 根据文件的 mimeType 设置 container 名称
        let matchs = null;
        let container = 'other';
        if ((matchs = /([a-z]+)\//igm.exec(mimeType)) && matchs.length === 2) {
            container = matchs[1];
        }
        return container;
    }
    /**
     * 针对上传框上传
     * @param {stream} stream 上传文件流，非 Node.js 中的流
     * @param {String}} container 容器名称，不指定，使用文件的 mimeType
     */
    async put(stream, container) {
        return await this.__upload(stream, stream.filename, stream.mimeType, container);
    }
    /**
     * 上传指定路径的文件
     * @param {String}} path 文件路径
     * @param {String} container 容器名称，不指定，使用文件的 mimeType
     */
    async putByPath(path, container) {
        const isExists = fse.pathExists(path);
        if (!isExists) {
            throw 'file not exists.';
        }
        const stream = fs.createReadStream(path);
        const mimeType = mime.getType(path)
        return await this.__upload(stream, path, mimeType, container);
    }
    async __upload(stream, filename, mimeType, container) {
        const extName = path.extname(filename);
        const newFileName = `${Date.now()}${extName}`;

        if (!container) {
            container = this.getContainer(mimeType);
        }

        debug(`qswift#container -> ${container}`);

        // 保存的本地文件名
        // 主要获得文件的 md5 值
        const localFilePath = path.join(this.localPath, newFileName);
        const md5 = await this.__saveToLocal(localFilePath, stream);
        debug(`qswift#md5 -> ${md5}`);
        // 先判断 swift 上是否有相应的文件，如果有直接返回
        // swift 上的文件名
        const swiftFileName = `${md5}${extName}`;
        const swiftClient = await SwiftClient.connection(this.config);

        // 防止 container 不存在，先创建
        await swiftClient.createContainer(container);

        // 先获得文件的 md5 值
        // 如果有就不上传，反之
        const fileHeaders = await swiftClient.headObject(container, swiftFileName);
        let uploadResult = true;
        if (fileHeaders['x-object-meta-md5'] !== md5) {
            const localFileStream = fs.createReadStream(localFilePath);
            uploadResult = await swiftClient.putObject(container, swiftFileName, localFileStream, {
                md5
            });
        }

        // 删除本地文件
        try {
            await fse.remove(localFilePath);
        } catch (err) {
            this.app.coreLogger.error(`[egg-qswift] ${err}`);
        }
        const retValue = {
            ret: uploadResult,
            data: `/${container}/${swiftFileName}`
        };
        debug(`qswift#ret -> ${JSON.stringify(retValue)}`);
        return retValue;
    }
    async __saveToLocal(filePath, stream) {
        const fsHash = crypto.createHash('md5');
        stream.on('data', chunk => {
            fsHash.update(chunk);
        });
        stream.pipe(fs.createWriteStream(filePath));
        return new Promise((resolve, reject) => {
            stream.on('end', () => {
                const md5 = fsHash.digest('hex');
                resolve(md5);
            });
            stream.on('error', reject);
        });
    }
}
module.exports = Upload;
