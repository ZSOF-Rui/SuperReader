(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var MANIFEST_URL = new URL('data/releases.json', document.baseURI);
  var STORAGE = {
    code: 'sr.site.currentCode',
    channel: 'sr.site.channel'
  };

  var state = {
    manifest: null,
    manifestPromise: null,
    codeTouched: false,
    channel: 'stable'
  };

  var form = document.getElementById('update-form');
  var codeInput = document.getElementById('current-code');
  var channelSelect = document.getElementById('update-channel');
  var resultBox = document.getElementById('update-result');
  var submitButton = document.getElementById('update-submit');
  var channelHint = document.getElementById('channel-hint');

  /* ---------- small helpers ---------- */

  function readString(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeString(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* storage can be unavailable in private mode */
    }
  }

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function formatBytes(bytes) {
    var value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '';
    return (value / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(iso) {
    if (typeof iso !== 'string' || iso.length < 10) return '';
    return iso.slice(0, 10);
  }

  function channelEntry(key) {
    if (!state.manifest || !state.manifest.channels) return null;
    var channel = state.manifest.channels[key || state.channel];
    return channel && typeof channel === 'object' ? channel : null;
  }

  function latestRelease(key) {
    var channel = channelEntry(key);
    return channel && channel.latest ? channel.latest : null;
  }

  function channelLabel(key) {
    var channel = channelEntry(key);
    if (channel && channel.label) return channel.label;
    return (key || state.channel) === 'preview' ? '预览版' : '正式版';
  }

  function channelPackage(key) {
    var channel = channelEntry(key);
    return channel && channel.packageName ? channel.packageName : '';
  }

  function downloadURL(file) {
    if (!file) return '';
    return new URL(file, document.baseURI).href;
  }

  function setText(panel, selector, text) {
    var element = panel.querySelector(selector);
    if (element && text !== undefined && text !== null && text !== '') {
      element.textContent = String(text);
    }
  }

  /* ---------- manifest ---------- */

  function loadManifest(force) {
    if (!state.manifestPromise || force) {
      state.manifestPromise = fetch(MANIFEST_URL.href, { cache: 'no-store' })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function (data) {
          if (!data || typeof data !== 'object' || !data.channels || typeof data.channels !== 'object') {
            throw new Error('版本清单格式不正确');
          }
          if (!data.channels.stable || !data.channels.stable.latest) {
            throw new Error('版本清单中没有正式版');
          }
          state.manifest = data;
          ['stable', 'preview'].forEach(function (key) {
            if (data.channels[key] && data.channels[key].latest) hydrateDownload(key);
          });
          updateChannelHint();
          return data;
        });
    }
    return state.manifestPromise;
  }

  function hydrateDownload(channelKey) {
    var panel = document.querySelector('.download-panel[data-channel="' + channelKey + '"]');
    var latest = latestRelease(channelKey);
    var packageName = channelPackage(channelKey);
    if (!panel || !latest) return;

    setText(panel, '.js-version', latest.versionName);
    setText(panel, '.js-code', latest.versionCode);
    setText(panel, '.js-package', packageName);
    setText(panel, '.js-size', formatBytes(latest.sizeBytes));
    setText(panel, '.js-date', formatDate(latest.releasedAt));
    setText(panel, '.js-sha', latest.sha256);

    var link = panel.querySelector('.js-download');
    if (link) {
      var url = downloadURL(latest.file);
      if (url) link.href = url;
      link.setAttribute('download', latest.file ? latest.file.split('/').pop() : '');
    }

    var copy = panel.querySelector('.copy-sha');
    if (copy && latest.sha256) copy.setAttribute('data-sha', latest.sha256);
  }

  function updateChannelHint() {
    if (!channelHint) return;
    var latest = latestRelease();
    var label = channelLabel();
    if (latest) {
      channelHint.textContent = label + '最新：' + latest.versionName + ' (' + latest.versionCode + ')';
    } else if (state.manifest) {
      channelHint.textContent = '版本清单中没有' + label + '。';
    } else {
      channelHint.textContent = '正在读取版本清单…';
    }
  }

  /* ---------- update checker ---------- */

  function showLoading() {
    resultBox.className = 'update-result is-loading';
    resultBox.replaceChildren(
      node('h4', '', '正在读取版本清单…'),
      node('p', '', '清单来自本站静态文件，不会上传你填写的版本号。')
    );
  }

  function addActions(container, actions) {
    if (!actions || !actions.length) return;
    var row = node('div', 'result-actions');
    actions.forEach(function (action) {
      var element;
      if (action.href) {
        element = node('a', 'btn ' + (action.kind || 'btn-quiet'), action.label);
        element.href = action.href;
        if (action.download) element.setAttribute('download', action.download);
      } else {
        element = node('button', 'btn ' + (action.kind || 'btn-quiet'), action.label);
        element.type = 'button';
        if (action.onClick) element.addEventListener('click', action.onClick);
      }
      row.append(element);
    });
    container.append(row);
  }

  function renderResult(kind, title, message, extra) {
    var options = extra || {};
    resultBox.className = 'update-result ' + kind;
    resultBox.replaceChildren();
    resultBox.append(node('h4', '', title));
    if (message) resultBox.append(node('p', '', message));
    if (options.meta) resultBox.append(node('p', 'meta', options.meta));
    if (options.notes && options.notes.length) {
      var list = node('ul');
      options.notes.forEach(function (note) {
        if (note) list.append(node('li', '', note));
      });
      if (list.childNodes.length) resultBox.append(list);
    }
    addActions(resultBox, options.actions);
  }

  function compareVersion() {
    var raw = String(codeInput.value || '').trim();
    var currentCode = Number(raw);

    codeInput.removeAttribute('aria-invalid');

    if (!raw || !Number.isInteger(currentCode) || currentCode < 1) {
      codeInput.setAttribute('aria-invalid', 'true');
      renderResult('is-error', '请填写有效的 versionCode', 'versionCode 是 App「设置 → 检查更新」里括号中的整数，例如 1.6.0 (13) 里的 13。');
      codeInput.focus();
      return;
    }

    if (channelSelect) {
      state.channel = channelSelect.value === 'preview' ? 'preview' : 'stable';
    }
    writeString(STORAGE.code, String(currentCode));
    writeString(STORAGE.channel, state.channel);
    showLoading();
    submitButton.disabled = true;
    submitButton.textContent = '读取版本清单…';

    loadManifest(true)
      .then(function () {
        var label = channelLabel();
        var latest = latestRelease();
        if (!latest) throw new Error('版本清单中没有' + label);

        var latestCode = Number(latest.versionCode);
        if (!Number.isInteger(latestCode)) throw new Error('版本号格式不正确');

        var url = downloadURL(latest.file);
        var fileName = latest.file ? latest.file.split('/').pop() : '';
        var meta = [
          '通道：' + label,
          '包名：' + (channelPackage() || '未标注'),
          '最新版本：' + latest.versionName + ' (' + latestCode + ')',
          '发布日期：' + (formatDate(latest.releasedAt) || '未标注'),
          '安装包：' + (formatBytes(latest.sizeBytes) || '未标注')
        ].join(' · ');

        if (currentCode < latestCode) {
          var updateActions = [];
          if (url) {
            updateActions.push({
              label: '下载' + label + ' ' + latest.versionName,
              href: url,
              download: fileName,
              kind: 'btn-primary'
            });
          }
          renderResult('is-update', '有新版本可用', '你填写的 versionCode 是 ' + currentCode + '，' + label + '最新为 ' + latestCode + '。', {
            meta: meta,
            notes: latest.notes,
            actions: updateActions
          });
          addShaAction(latest.sha256);
        } else if (currentCode === latestCode) {
          renderResult('is-latest', '已是最新版本', label + ' ' + latest.versionName + ' (' + latestCode + ') 是本站当前发布的最新版本。', {
            meta: meta,
            actions: [
              { label: '查看下载页', href: '#download' }
            ]
          });
          addShaAction(latest.sha256);
        } else {
          renderResult('is-newer', '当前版本高于本站发布', '你填写的 versionCode 是 ' + currentCode + '，高于本站' + label + '的 ' + latestCode + '。可能来自本地构建，请确认包名一致。', {
            meta: meta,
            actions: url ? [{ label: '下载本站最新包', href: url, download: fileName }] : []
          });
        }

        updateChannelHint();
      })
      .catch(function (error) {
        var reason = error && error.message ? error.message : '未知错误';
        codeInput.setAttribute('aria-invalid', 'true');
        renderResult('is-error', '无法完成检查', '读取版本清单失败（' + reason + '）。请确认页面通过 HTTP(S) 打开，且 data/releases.json 存在；直接以 file:// 双击打开时，浏览器通常会拦截本地 fetch。', {
          actions: [
            { label: '重试检查', kind: 'btn-quiet', onClick: function () { compareVersion(); } },
            { label: '直接去下载', href: '#download' }
          ]
        });
        if (channelHint) channelHint.textContent = '版本清单读取失败，请稍后重试。';
      })
      .then(function () {
        submitButton.disabled = false;
        submitButton.textContent = '检查更新';
      });
  }

  function addShaAction(sha) {
    if (!sha || !resultBox) return;
    var row = resultBox.querySelector('.result-actions');
    if (!row) {
      row = node('div', 'result-actions');
      resultBox.append(row);
    }
    var button = node('button', 'btn btn-quiet copy-sha', '复制 SHA-256');
    button.type = 'button';
    button.setAttribute('data-sha', sha);
    row.append(button);
  }

  codeInput.addEventListener('input', function () {
    state.codeTouched = true;
    codeInput.removeAttribute('aria-invalid');
  });

  if (channelSelect) {
    channelSelect.addEventListener('change', function () {
      state.channel = channelSelect.value === 'preview' ? 'preview' : 'stable';
      writeString(STORAGE.channel, state.channel);
      codeInput.removeAttribute('aria-invalid');
      updateChannelHint();
      var latest = latestRelease();
      if (latest) {
        state.codeTouched = false;
        codeInput.value = String(latest.versionCode);
      }
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    compareVersion();
  });

  /* ---------- copy SHA-256 ---------- */

  function copyText(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.append(area);
      area.select();
      var ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    var button = event.target.closest('.copy-sha');
    if (!button) return;
    var sha = button.getAttribute('data-sha');
    var original = button.textContent;
    copyText(sha).then(function (ok) {
      button.textContent = ok ? '已复制' : '复制失败';
      window.setTimeout(function () {
        button.textContent = original;
      }, 1600);
    });
  });

  /* ---------- init ---------- */

  var storedCode = Number(readString(STORAGE.code, ''));
  if (Number.isInteger(storedCode) && storedCode > 0) {
    codeInput.value = String(storedCode);
  }

  if (readString(STORAGE.channel, 'stable') === 'preview') {
    state.channel = 'preview';
  }
  if (channelSelect) {
    channelSelect.value = state.channel;
  }

  loadManifest()
    .then(function () {
      var latest = latestRelease();
      if (latest && !state.codeTouched && !(Number.isInteger(storedCode) && storedCode > 0)) {
        codeInput.value = String(latest.versionCode);
      }
    })
    .catch(function () {
      updateChannelHint();
    });
})();
