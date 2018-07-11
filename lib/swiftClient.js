'use strict';
const debug = require('debug')('qswift');
const assert = require('assert');
const urllib = require('urllib');

class SwiftClient {
    constructor(config) {
        this.config = config;
    }

    /**
     * 获得所有容器或指定容器
     * @param {String} container 不填则返回所有容器
     * @return {Array} array 返回所有的容器
     */
    async list(container = '') {
        const { storageUrl } = this.config;
        const requestUrl = `${storageUrl}/${container}?format=json`;
        debug(`list -> start request storageUrl: ${requestUrl}`);
        const ret = await this._request(requestUrl, {
            dataType: 'json'
        });
        const result = ret.data;
        if (container === '') {
            debug(`list -> container count: ${result.length}`);
        }
        return result;
    }

    /**
     * 添加容器
     * @param {String} name 容器名称
     * @param {String} publicRead 访问权限，默认允许任何HTTP均可访问对象
     * @return {Boolean} true / false
     */
    async createContainer(name, publicRead = '.r:*') {
        const { storageUrl } = this.config;
        if (!name) {
            throw new Error('should pass container name');
        }
        debug(`createContainer -> ${storageUrl}`);
        const ret = await this._request(`${storageUrl}/${name}`, {
            method: 'PUT',
            headers: {
                'X-Container-Read': publicRead
            }
        });
        debug(`createContainer -> status: ${ret.status}`);

        // 201 成功， 202 已存在
        if (ret.status === 201) {
            return true;
        }
        return false;
    }

    /**
     * 删除容器，如果容器内有对象则删除不了
     * @param {String} name 容器名称
     * @return {Boolean} true / false
     */
    async deleteContainer(name) {
        const { storageUrl } = this.config;
        debug(`deleteContainer -> ${storageUrl}`);
        const ret = await this._request(`${storageUrl}/${name}`, {
            method: 'DELETE'
        });
        debug(`deleteContainer -> status: ${ret.status}`);
        if (ret.status !== 204) {
            return false;
        }
        return true;
    }

    /**
     * 上传对象
     * @param {String} container 容器名称
     * @param {String} fileName 对象名称
     * @param {Stream} fileStream 文件流
     * @param {Object} meta meta 信息
     * @return {Boolean} true / false
     */
    async putObject(container, fileName, fileStream, meta = {}) {
        const { storageUrl } = this.config;
        const requestUrl = `${storageUrl}/${container}/${fileName}`;
        debug(`upload object -> ${requestUrl}`);

        const metaData = {};
        for (const key in meta) {
            metaData[`X-Object-Meta-${key}`] = meta[key];
        }

        const ret = await this._request(requestUrl, {
            method: 'PUT',
            stream: fileStream,
            headers: metaData
        });
        debug(`upload object -> status: ${ret.status}`);
        if (ret.status !== 201) {
            return false;
        }
        return true;
    }

    /**
     * 删除对象
     * @param {string} container 容器名称
     * @param {string} fileName 对象名称
     * @return {Boolean} true / false
     */
    async deleteObject(container, fileName) {
        const { storageUrl } = this.config;
        const requestUrl = `${storageUrl}/${container}/${fileName}`;
        debug(`delete object -> ${requestUrl}`);
        const ret = await this._request(requestUrl, {
            method: 'DELETE'
        });
        debug(`delete object -> status: ${ret.status}`);
        if (ret.status !== 204) {
            return false;
        }
        return true;
    }

    /**
     * 获取对象 meta 信息
     * @param {String} container 容器名称
     * @param {String} fileName 对象名称
     * @return {Object} headers 所有的headers
     */
    async headObject(container, fileName) {
        const { storageUrl } = this.config;
        const requestUrl = `${storageUrl}/${container}/${fileName}`;
        debug(`head object -> ${requestUrl}`);
        const ret = await this._request(requestUrl, {
            method: 'HEAD'
        });
        if (ret.status !== 200) {
            return {};
        }
        return ret.headers;
    }

    async _request(url, param = {}) {
        const options = Object.assign({}, param);
        options.headers = Object.assign({}, param.headers || {}, {
            'X-Auth-Token': this.config.authToken || ''
        });
        const result = await urllib.request(url, options);
        return result;
    }
}

SwiftClient.connection = async config => {
    assert(config.authUrl, 'should pass config.authUrl');
    assert(config.userName, 'should pass config.userName');
    assert(config.userPassword, 'should pass config.userPassword');
    const ret = await urllib.request(config.authUrl, {
        headers: {
            'X-Auth-User': config.userName,
            'X-Auth-Key': config.userPassword
        }
    });

    // 获得 header
    const headers = ret.headers;

    config = Object.assign({}, config, {
        storageUrl: headers['x-storage-url'],
        authToken: headers['x-auth-token'],
        stroageToken: headers['x-storage-token'],
        transId: headers['x-trans-id']
    });
    return new SwiftClient(config);
};

module.exports = SwiftClient;
