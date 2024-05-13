async function submit() {
  const uri = document.getElementById("uritf").value;
  const body = document.getElementById("bodytf").value;
  const method = document.getElementById("method").value;
  const encode = document.getElementById("encode").value;
  const out_ta = document.getElementById("output_ta");
  const out_code = document.getElementById("output_code");

  // confirm dialog
  if (method === "POST") {
    if (!confirm("Confirm POST to " + uri)) {
      return;
    }
  }

  out_code.innerText = "???";
  out_code.style.color = "black";
  out_ta.value = "Loading...";
  
  const response = await fetch(uri, {
    method: method,
    body: method === "GET" ? null : body,
    headers: {
      'Content-Type': encode
    }
  });
  console.log(response);

  out_code.innerText = response.status;
  out_code.style.color = response.ok ? "green" : "red";

  if (response.headers.get("Content-Length") === "0") {
    out_ta.value = "No content";
    return;
  } else if (response.headers.get("Content-Type").includes("application/json")) {
    response
      .json()
      .then(data => out_ta.value = JSON.stringify(data, null, '\t'))
      .catch(err => out_ta.value = `Error ${err.message}, Status ${response.status}`);
  } else {
    response
      .text()
      .then(data => out_ta.value = data)
      .catch(err => out_ta.value = `Error ${err.message}, Status ${response.status}`);
  }
}

function update_urlencoded() {
  let dec = document.getElementById("urlencodetf");
  let enc = document.getElementById("urlencodedtf");
  enc.value = encodeURIComponent(dec.value);
}

const today = (() => {
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  if (month < 10) month = "0" + month.toString();
  let day = date.getDate();
  if (day < 10) day = "0" + day.toString();
  return `${year}-${month}-${day}`;
})();

const normal_templates = {
  "health_checks": {
    "uri": "/api/v1/admin/health",
    "method": "GET",
    "title": "Health"
  },
  "list_logs": {
    "uri": "/api/v1/admin/listlogs?detail=0",
    "method": "GET",
    "title": "List logs"
  },
  "fetch_new_log": {
    "uri": "/api/v1/admin/fetchlog",
    "method": "POST",
    "body": `date=${today}&token=`,
    "encode": "application/x-www-form-urlencoded",
    "title": "Fetch new log"
  },
  "parse_log": {
    "uri": "/api/v1/admin/parselog",
    "body": `fname=${today}.log.zip`,
    "method": "POST",
    "encode": "application/x-www-form-urlencoded",
    "title": "Parse log"
  },
  "unset_mutex": {
    "uri": "/api/v1/admin/unsetmutex",
    "method": "POST",
    "title": "Unset mutex"
  },
  "loglevel": {
    "uri": "/api/v1/admin/loglevel",
    "method": "POST",
    "body": `level=0&token=`,
    "encode": "application/x-www-form-urlencoded",
    "title": "Set loglevel",
  },
  "parseprogress": {
    "uri": "/api/v1/admin/parseprogress",
    "method": "GET",
    "title": "Parse progress"
  },
  "restart": {
    "uri": "/api/v1/admin/restart",
    "method": "POST",
    "title": "Restart",
    "body": `token=`,
    "encode": "application/x-www-form-urlencoded",
  },
  "telemetryreport": {
    "uri": "/api/v1/admin/telemetryreport",
    "method": "GET",
    "title": "Telemetry report",
  },
  "Cleardbcache": {
    "uri": "/api/v1/admin/cleardbcache",
    "method": "POST",
    "title": "Clear DB cache",
    "body": `token=`,
    "encode": "application/x-www-form-urlencoded",
  }
}

const dev_templates = {
  "reset_db": {
    "uri": "/api/v1/dev/makedb",
    "method": "POST",
    "title": "Reset DB"
  },
  "parsealllogs": {
    "uri": "/api/v1/dev/parsealllogs",
    "method": "POST",
    "title": "Parse all logs",
  },
  "parsealllogsprogress": {
    "uri": "/api/v1/dev/parsealllogsprogress",
    "method": "GET",
    "title": "Parse all logs progress",
  },
}

function load_template(template) {
  const tf_uri = document.getElementById("uritf");
  const tf_method = document.getElementById("method");
  const tf_body = document.getElementById("bodytf");
  const tf_encode = document.getElementById("encode");

  tf_uri.value = templates[template].uri;
  tf_method.value = templates[template].method;
  tf_body.value = templates[template].body || "";
  if (templates[template].encode)
    tf_encode.value = templates[template].encode;
}

function init_templates(templates) {
  const container = document.getElementById("template-buttons");

  for (let template in templates) {
    const btn = document.createElement("button");
    btn.id = `template_${template}`;
    btn.classList.add("btn");
    btn.classList.add("btn-secondary");
    btn.innerText = templates[template].title;
    btn.addEventListener("click", () => load_template(template));
    container.appendChild(btn);
  }
}

async function dev_active() {
  const res = await fetch("/api/v1/dev/active");
  return res.status === 200;
}

function copy_urlencoded() {
  const enc = document.getElementById("urlencodedtf").value;
  navigator.clipboard.writeText(enc);
}

document.addEventListener("DOMContentLoaded", async function() {
  document.getElementById("submitbtn").addEventListener("click", submit);
  
  document.getElementById("urlencodetf").addEventListener("input", update_urlencoded);
  document.getElementById("btn-clip-urlencoded").addEventListener("click", copy_urlencoded);
  update_urlencoded();

  const dev_active = await dev_active();
  let templates = dev_active ? { ...normal_templates, ...dev_templates } : normal_templates;
  init_templates(templates);
});