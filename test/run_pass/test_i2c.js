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

/* This test is based on Raspberry Pi with GY-30 Sensor. */

var assert = require('assert');
var I2C = require('i2c');

var i2c = new I2C();

var wire = i2c.open({device: '/dev/i2c-1', address: 0x23}, function(err) {
  if (err) {
    throw err;
  }
});

wire.write([0x10], function(err) {
  assert.equal(err, null);
  console.log('write done');
});

wire.writeByte(0x10, function(err) {
  assert.equal(err, null);
  console.log('writeByte done');
});

wire.read(2, function(err, res) {
  assert.equal(err, null);
  assert.equal(res.length, 2, 'I2C read failed.(length is not equal)');
  console.log('read result: '+res[0]+', '+res[1]);
});

wire.readByte(function(err, res) {
  assert.equal(err, null);
  console.log('readByte result: '+res);
});

wire.readBytes(0x20, 2, function(err, res) {
  assert.equal(err, null);
  assert.equal(res.length, 2, 'I2C readBytes failed.(length is not equal)');
  console.log('readBytes(cmd:0x20, length:2) result: '+res[0]+', '+res[1]);
});
