async function submit() {
  const uri = document.getElementById("uritf").value;
  const body = document.getElementById("bodytf").value;
  const method = document.getElementById("method").value;
  const encode = document.getElementById("encode").value;
  const out = document.getElementById("output");

  // confirm dialog
  if (method === "POST") {
    if (!confirm("Confirm POST to " + uri)) {
      return;
    }
  }
  
  const response = await fetch(uri, {
    method: method,
    body: method === "GET" ? null : body,
    headers: {
      'Content-Type': encode
    }
  });
  console.log(response);

  response
    .json()
    .then(data => out.value = JSON.stringify(data, null, '\t'))
    .catch(err => out.value = `Error ${err.message}, Status ${response.status}`);
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

const templates = {
  "health_checks": {
    "uri": "/api/v1/admin/health",
    "method": "GET",
    "title": "Health"
  },
  "list_logs": {
    "uri": "/api/v1/admin/listlogs",
    "method": "GET",
    "title": "List logs"
  },
  "fetch_new_log": {
    "uri": "/api/v1/admin/fetchlog",
    "method": "POST",
    "body": `fname=${today}&token=`,
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
  "reset_db": {
    "uri": "/api/v1/dev/makedb",
    "method": "POST",
    "title": "Reset DB"
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

function init_templates() {
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

function copy_urlencoded() {
  const enc = document.getElementById("urlencodedtf").value;
  navigator.clipboard.writeText(enc);
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("submitbtn").addEventListener("click", submit);
  
  document.getElementById("urlencodetf").addEventListener("input", update_urlencoded);
  document.getElementById("btn-clip-urlencoded").addEventListener("click", copy_urlencoded);
  update_urlencoded();

  init_templates();
});