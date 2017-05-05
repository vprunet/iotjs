/* Copyright 2015-present Samsung Electronics Co., Ltd. and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var Native = require('native');
var fs = Native.require('fs');

function iotjs_module_t(id, parent) {
  this.id = id;
  this.exports = {};
  this.filename = null;
  this.parent = parent;
};

module.exports = iotjs_module_t;


iotjs_module_t.cache = {};
iotjs_module_t.wrapper = Native.wrapper;
iotjs_module_t.wrap = Native.wrap;


var cwd;
try { cwd = process.cwd(); } catch (e) { }

var moduledirs = [""]
if(cwd){
  moduledirs.push(cwd + "/");
  moduledirs.push(cwd + "/node_modules/");
}
if(process.env.HOME){
  moduledirs.push(process.env.HOME + "/node_modules/");
}
if(process.env.NODE_PATH){
  moduledirs.push(process.env.NODE_PATH + "/node_modules/")
}


iotjs_module_t.resolveDirectories = function(id, parent) {
  var dirs = moduledirs;
  if(parent) {
    if(!parent.dirs){
      parent.dirs = [];
    }
    dirs = parent.dirs.concat(dirs);
  }
  return dirs;
};


iotjs_module_t.resolveFilepath = function(id, directories) {

  for(var i = 0; i<directories.length ; i++) {
    var dir = directories[i];
    // 1. 'id'
    var filepath = iotjs_module_t.tryPath(dir+id);

    if(filepath){
      return filepath;
    }

    // 2. 'id.js'
    filepath = iotjs_module_t.tryPath(dir+id+'.js');

    if(filepath){
      return filepath;
    }

    // 3. package path /node_modules/id
    var packagepath = dir + id;
    var jsonpath = packagepath + "/package.json";
    filepath = iotjs_module_t.tryPath(jsonpath);
    if(filepath){
      var pkgSrc = process.readSource(jsonpath);
      var pkgMainFile = JSON.parse(pkgSrc).main;
      filepath = iotjs_module_t.tryPath(packagepath + "/" + pkgMainFile);
      if(filepath){
        return filepath;
      }
      // index.js
      filepath = iotjs_module_t.tryPath(packagepath + "/" + "index.js");
      if(filepath){
        return filepath;
      }
    }

  }

  return false;
};


iotjs_module_t.resolveModPath = function(id, parent) {

  // 0. resolve Directory for lookup
  var directories = iotjs_module_t.resolveDirectories(id, parent);

  var filepath = iotjs_module_t.resolveFilepath(id, directories);

  if(filepath){
    return filepath;
  }

  return false;
};


iotjs_module_t.tryPath = function(path) {
  try {
    var stats = fs.statSync(path);
    if(stats && !stats.isDirectory()) {
      return path;
    }
  } catch (ex) {}

  return false;
};


iotjs_module_t.load = function(id, parent, isMain) {
  if(process.native_sources[id]){
    return Native.require(id);
  }
  var module = new iotjs_module_t(id, parent);

  var modPath = iotjs_module_t.resolveModPath(module.id, module.parent);

  var cachedModule = iotjs_module_t.cache[modPath];
  if (cachedModule) {
    return cachedModule.exports;
  }

  if (!modPath) {
    throw new Error('Module not found: ' + id);
  }

  module.filename = modPath;
  module.dirs = [modPath.substring(0, modPath.lastIndexOf('/') + 1)];
  module.compile();

  iotjs_module_t.cache[modPath] = module;

  return module.exports;
};


iotjs_module_t.prototype.compile = function() {
  var source = process.readSource(this.filename);
  var fn = process.compile(this.filename, source);
  fn.call(this.exports, this.exports, this.require.bind(this), this);
};


iotjs_module_t.runMain = function(){
  iotjs_module_t.load(process.argv[1], null, true);
  process._onNextTick();
};

iotjs_module_t.prototype.require = function(id) {
  return iotjs_module_t.load(id, this);
};
