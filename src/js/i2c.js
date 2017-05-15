/* Copyright (c) 2013, Kelly Korevec <korevec@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the author nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* Copyright 2016-present Samsung Electronics Co., Ltd. and other contributors
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

/* This file includes all APIs in 'node-i2c'(https://github.com/kelly/node-i2c).
 * Some functions are translated from coffee script(i2c.coffee) in 'node-i2c'.
 */

var util = require('util');
var i2c = process.binding(process.binding.i2c);

function I2C() {
  if (!(this instanceof I2C)) {
    return new I2C();
  }
}

I2C.prototype.open = function(configurable, callback) {
  return i2cBusOpen(configurable, callback);
};


function i2cBusOpen(configurable, callback) {
  var _binding = null;

  function I2CBus(configurable, callback) {
    if (util.isObject(configurable)) {
      if (process.platform === 'linux') {
        if (!util.isString(configurable.device)) {
          throw new TypeError('Bad configurable - device: String');
        }
      } else if (process.platform === 'nuttx') {
        if (!util.isNumber(configurable.device)) {
          throw new TypeError('Bad configurable - device: Number');
        }
      }

      if (!util.isNumber(configurable.address)) {
        throw new TypeError('Bad configurable - address: Number');
      }

      this.address = configurable.address;

      _binding = new i2c(configurable.device, (function(_this) {
        return function(err) {
          if (!err) {
            _this.setAddress(configurable.address);
          }
          util.isFunction(callback) && callback(err);
        };
      })(this));
    }
  }

  I2CBus.prototype.close = function() {
    _binding.close();
  };

  I2CBus.prototype.setAddress = function(address, callback) {
    if (!util.isNumber(address)) {
      throw new TypeError('Bad argument - address: Number');
    }

    this.address = address;
    _binding.setAddress(this.address);

    util.isFunction(callback) && callback();
  };

  I2CBus.prototype.write = function(array, callback) {
    if (!util.isArray(array)) {
      throw new TypeError('Bad argument - array: Array');
    }

    this.setAddress(this.address);
    _binding.write(array, function(err) {
      util.isFunction(callback) && callback(err);
    });
  };

  I2CBus.prototype.writeByte = function(byte, callback) {
    if (!util.isNumber(byte)) {
      throw new TypeError('Bad argument - byte: Number');
    }

    this.setAddress(this.address);
    _binding.writeByte(byte, function(err) {
      util.isFunction(callback) && callback(err);
    });
  };

  I2CBus.prototype.writeBytes = function(cmd, array, callback) {
    if (!util.isNumber(cmd)) {
      throw new TypeError('Bad argument - cmd: Number');
    }
    if (!util.isArray(array)) {
      throw new TypeError('Bad argument - array: Array');
    }

    this.setAddress(this.address);
    _binding.writeBlock(cmd, array, function(err) {
      util.isFunction(callback) && callback(err);
    });
  };

  I2CBus.prototype.read = function(length, callback) {
    if (!util.isNumber(length)) {
      throw new TypeError('Bad argument - length: Number');
    }

    this.setAddress(this.address);
    _binding.read(length, function(err, data) {
      util.isFunction(callback) && callback(err, data);
    });
  };

  I2CBus.prototype.readByte = function(callback) {
    this.setAddress(this.address);
    _binding.readByte(function(err, data) {
      util.isFunction(callback) && callback(err, data);
    });
  };

  I2CBus.prototype.readBytes = function(cmd, length, callback) {
    if (!util.isNumber(cmd)) {
      throw new TypeError('Bad argument - cmd: Number');
    }
    if (!util.isNumber(length)) {
      throw new TypeError('Bad argument - length: Number');
    }

    this.setAddress(this.address);
    _binding.readBlock(cmd, length, 0, function(err, resArray) {
      util.isFunction(callback) && callback(err, resArray);
    });
  };

  return new I2CBus(configurable, callback);
}


module.exports = I2C;
