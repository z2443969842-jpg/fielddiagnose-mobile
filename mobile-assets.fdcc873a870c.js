/* Hosting adapter only. Existing model bytes and inference code are unchanged. */
(function (window) {
  'use strict';

  const retry = '请检查网络后重试；首次使用时请保持联网。';
  const validSize = value => Number.isSafeInteger(value) && value > 0;
  const fail = message => new Error(message + '。' + retry);

  function progress(detail) {
    if (typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('field-mobile-asset-progress', { detail }));
    }
  }

  function localURL(relative) {
    const base = new URL(document.baseURI);
    const url = new URL(relative, base);
    if (url.origin !== base.origin) throw fail('模型资源地址不属于当前站点');
    return url;
  }

  async function download(url) {
    let response;
    try { response = await fetch(url, { credentials: 'same-origin' }); }
    catch (_) { throw fail('模型资源下载中断'); }
    if (!response.ok) throw fail('模型资源读取失败（HTTP ' + response.status + '）');
    try { return new Uint8Array(await response.arrayBuffer()); }
    catch (_) { throw fail('模型资源未能完整读取'); }
  }

  async function verifyPart(bytes, expected) {
    if (bytes.byteLength !== expected.bytes) throw fail('模型分片大小不符，可能尚未完整下载');
    if (!/^[a-f0-9]{64}$/i.test(expected.sha256 || '')) throw fail('模型分片校验信息无效');
    if (!globalThis.crypto?.subtle) throw fail('当前浏览器无法校验模型资源，请通过 HTTPS 使用 Safari、Chrome 或 Edge');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== expected.sha256.toLowerCase()) throw fail('模型分片校验失败，下载内容与原模型不一致');
  }

  async function readAsset(name, report) {
    if (typeof name !== 'string' || !name || name.split(/[\\/]/).includes('..') || /[?#]/.test(name)) {
      throw fail('模型资源名称无效');
    }
    const map = window.FieldMobileAssetMap || {};
    if (!Object.prototype.hasOwnProperty.call(map, name)) {
      const bytes = await download(localURL('assets/vision-ai/' + name));
      report(bytes.byteLength, bytes.byteLength);
      return bytes;
    }

    const asset = map[name];
    if (!asset || !validSize(asset.bytes) || !Array.isArray(asset.parts) || !asset.parts.length ||
        asset.parts.some(part => !part || typeof part.url !== 'string' || !validSize(part.bytes)) ||
        asset.parts.reduce((total, part) => total + part.bytes, 0) !== asset.bytes) {
      throw fail('模型分片清单不完整');
    }

    // Keep one final buffer and one downloaded part; do not retain model Promises.
    let result;
    try { result = new Uint8Array(asset.bytes); }
    catch (_) { throw fail('设备暂时没有足够空间读取该模型，请关闭其他页面后重试'); }
    let offset = 0;
    report(0, asset.bytes);
    for (const part of asset.parts) {
      const bytes = await download(localURL(part.url));
      await verifyPart(bytes, part);
      result.set(bytes, offset);
      offset += bytes.byteLength;
      report(offset, asset.bytes);
    }
    return result;
  }

  window.__readVisionAsset = async function (name, onProgress) {
    let loaded = 0, total = 0;
    try {
      const bytes = await readAsset(name, (nextLoaded, nextTotal) => {
        loaded = nextLoaded; total = nextTotal;
        if (typeof onProgress === 'function') onProgress({ loaded, total });
        progress({ name, loaded, total, done: false });
      });
      progress({ name, loaded, total, done: true });
      return bytes;
    } catch (error) {
      const message = error?.message || '模型资源读取失败';
      const explained = message.includes(retry) ? error : fail(message);
      progress({ name, loaded, total, done: true, error: true, message: explained.message });
      throw explained;
    }
  };
})(window);
