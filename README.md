# egg-qswift

qunar swift for egg

## Install

```bash
npm i egg-qswift --save
```

## Usage

```js
// {app_root}/config/plugin.js
exports.qswift = {
  enable: true,
  package: 'egg-qswift',
};
```

## Configuration

```js
// {app_root}/config/config.default.js
exports.qswift = {
    authUrl: 'http://xxx/auth/v1.0',
    userName: 'xxxx',
    userPassword: 'yyyy'
};
```

> 如果出现错误，会往 common-error.log 中记录，而不会抛出异常。

see [config/config.default.js](config/config.default.js) for more detail.

## Example

上传图片

```js
const requestStream = await ctx.getFileStream();
const result = await ctx.qswift.put(requestStream);
```

返回值

```js
{
    ret: true,
    data: '/application/795e5c9a5d380c4ce129f11d7dcad150.xlsx'
}
```

> 默认以文件 mimeType 作为 container

自定义 container

```js
const requestStream = await ctx.getFileStream();
const result = await ctx.qswift.put(requestStream, abc);
```

返回值

```js
{
    ret: true,
    data: '/abc/795e5c9a5d380c4ce129f11d7dcad150.xlsx'
}
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## Version

Node >= 8.0.0

## License

[MIT](LICENSE)