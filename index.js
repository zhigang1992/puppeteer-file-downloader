const fs = require('fs');
const tmp = require('tmp');

const parseDataUrl = (dataUrl) => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (matches.length !== 3) {
    throw new Error('Could not parse data URL.');
  }
  return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};

const _fetchInPage = async ({file, options}) => {
  options = Object.assign({ credentials: 'same-origin' }, options );
  const response = await fetch(file, options);
  if (!response.ok) {
    throw new Error(`Could not download file, (status ${response.status}`);
  }
  const data = await response.blob()
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.addEventListener('loadend', () => resolve(reader.result));
    reader.readAsDataURL(data);
  });
};

const download = async ({file, onPage, to, options={}}) => {
  const dataUrl = await onPage.evaluate(_fetchInPage, {file, options})
  const { mime, buffer } = parseDataUrl(dataUrl)
  const target = to || tmp.tmpNameSync()
  fs.writeFileSync(target, buffer, 'base64');
  return target
}

const retrieveFromChrome = async ({file, onPage, to}) => {
  const tree = await onPage._client.send('Page.getResourceTree');
  const { content, base64Encoded } = await onPage._client.send(
    'Page.getResourceContent',
    { frameId: String(onPage.mainFrame()._id), url: file },
  );
  if (!base64Encoded) {
    throw new Error(`Content is not Base64 encoded: ${content}`)
  }
  const contentBuffer = Buffer.from(content, 'base64');
  const target = to || tmp.tmpNameSync()
  fs.writeFileSync(target, contentBuffer, 'base64');
  return target
}

module.exports = {download, retrieveFromChrome}
