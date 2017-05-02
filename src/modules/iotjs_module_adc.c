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

#include "iotjs_def.h"
#include "iotjs_module_adc.h"
#include "iotjs_objectwrap.h"


static void iotjs_adc_destroy(iotjs_adc_t* adc);
IOTJS_DEFINE_NATIVE_HANDLE_INFO(adc);
static iotjs_adc_t* iotjs_adc_instance_from_jval(const iotjs_jval_t* jadc);


static iotjs_adc_t* iotjs_adc_create(const iotjs_jval_t* jadc) {
  iotjs_adc_t* adc = IOTJS_ALLOC(iotjs_adc_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_adc_t, adc);
  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jadc, &adc_native_info);

  return adc;
}


static void iotjs_adc_destroy(iotjs_adc_t* adc) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_adc_t, adc);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
#if defined(__linux__)
  iotjs_string_destroy(&_this->device);
#endif
  IOTJS_RELEASE(adc);
}


#define THIS iotjs_adc_reqwrap_t* adc_reqwrap


static iotjs_adc_reqwrap_t* iotjs_adc_reqwrap_create(
    const iotjs_jval_t* jcallback, const iotjs_jval_t* jadc, AdcOp op) {
  iotjs_adc_reqwrap_t* adc_reqwrap = IOTJS_ALLOC(iotjs_adc_reqwrap_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_adc_reqwrap_t, adc_reqwrap);

  iotjs_reqwrap_initialize(&_this->reqwrap, jcallback, (uv_req_t*)&_this->req);

  _this->req_data.op = op;
  _this->adc_instance = iotjs_adc_instance_from_jval(jadc);
  return adc_reqwrap;
}


static void iotjs_adc_reqwrap_destroy(THIS) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_adc_reqwrap_t, adc_reqwrap);
  iotjs_reqwrap_destroy(&_this->reqwrap);
  IOTJS_RELEASE(adc_reqwrap);
}


static void iotjs_adc_reqwrap_dispatched(THIS) {
  IOTJS_VALIDATABLE_STRUCT_METHOD_VALIDATE(iotjs_adc_reqwrap_t, adc_reqwrap);
  iotjs_adc_reqwrap_destroy(adc_reqwrap);
}


static uv_work_t* iotjs_adc_reqwrap_req(THIS) {
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_reqwrap_t, adc_reqwrap);
  return &_this->req;
}


static const iotjs_jval_t* iotjs_adc_reqwrap_jcallback(THIS) {
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_reqwrap_t, adc_reqwrap);
  return iotjs_reqwrap_jcallback(&_this->reqwrap);
}


static iotjs_adc_t* iotjs_adc_instance_from_jval(const iotjs_jval_t* jadc) {
  uintptr_t handle = iotjs_jval_get_object_native_handle(jadc);
  return (iotjs_adc_t*)handle;
}


iotjs_adc_reqwrap_t* iotjs_adc_reqwrap_from_request(uv_work_t* req) {
  return (iotjs_adc_reqwrap_t*)(iotjs_reqwrap_from_request((uv_req_t*)req));
}


iotjs_adc_reqdata_t* iotjs_adc_reqwrap_data(THIS) {
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_reqwrap_t, adc_reqwrap);
  return &_this->req_data;
}


iotjs_adc_t* iotjs_adc_instance_from_reqwrap(THIS) {
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_reqwrap_t, adc_reqwrap);
  return _this->adc_instance;
}


#undef THIS


static void iotjs_adc_after_work(uv_work_t* work_req, int status) {
  iotjs_adc_reqwrap_t* req_wrap = iotjs_adc_reqwrap_from_request(work_req);
  iotjs_adc_reqdata_t* req_data = iotjs_adc_reqwrap_data(req_wrap);
  iotjs_jargs_t jargs = iotjs_jargs_create(2);
  bool result = req_data->result;

  if (status) {
    iotjs_jval_t error = iotjs_jval_create_error("System error");
    iotjs_jargs_append_jval(&jargs, &error);
    iotjs_jval_destroy(&error);
  } else {
    switch (req_data->op) {
      case kAdcOpOpen:
        if (!result) {
          iotjs_jargs_append_error(&jargs, "Failed to open ADC device");
        } else {
          iotjs_jargs_append_null(&jargs);
        }
        break;
      case kAdcOpRead:
        if (!result) {
          iotjs_jargs_append_error(&jargs, "Cannot read from ADC device");
        } else {
          iotjs_jargs_append_null(&jargs);
          iotjs_jargs_append_number(&jargs, req_data->value);
        }
        break;
      case kAdcOpClose:
        if (!result) {
          iotjs_jargs_append_error(&jargs, "Cannot close ADC device");
        } else {
          iotjs_jargs_append_null(&jargs);
        }
        break;
      default: {
        IOTJS_ASSERT(!"Unreachable");
        break;
      }
    }
  }

  const iotjs_jval_t* jcallback = iotjs_adc_reqwrap_jcallback(req_wrap);
  iotjs_make_callback(jcallback, iotjs_jval_get_undefined(), &jargs);

  iotjs_jargs_destroy(&jargs);

  iotjs_adc_reqwrap_dispatched(req_wrap);
}


static void iotjs_adc_set_configuration(iotjs_adc_t* adc,
                                        const iotjs_jval_t* jconfiguration) {
#if defined(__linux__)
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_t, adc);
  iotjs_jval_t jdevice =
      iotjs_jval_get_property(jconfiguration, IOTJS_MAGIC_STRING_DEVICE);
  _this->device = iotjs_jval_as_string(&jdevice);
  iotjs_jval_destroy(&jdevice);
#elif defined(__NUTTX__)
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_adc_t, adc);
  iotjs_jval_t jpin =
      iotjs_jval_get_property(jconfiguration, IOTJS_MAGIC_STRING_PIN);
  _this->pin = iotjs_jval_as_number(&jpin);
  iotjs_jval_destroy(&jpin);
#endif
}


static void iotjs_adc_read_worker(uv_work_t* work_req) {
  ADC_WORKER_INIT;
  int32_t value = iotjs_adc_read(adc);

  if (value < 0) {
    req_data->result = false;
    return;
  }

  req_data->value = value;
  req_data->result = true;
}


static void iotjs_adc_close_worker(uv_work_t* work_req) {
  ADC_WORKER_INIT;

  // Release driver
  if (!iotjs_adc_close(adc)) {
    req_data->result = false;
    return;
  }

  req_data->result = true;
}


#define ADC_ASYNC(call, jthis, jcallback, op)                                  \
  do {                                                                         \
    uv_loop_t* loop = iotjs_environment_loop(iotjs_environment_get());         \
    iotjs_adc_reqwrap_t* req_wrap =                                            \
        iotjs_adc_reqwrap_create(jcallback, jthis, op);                        \
    uv_work_t* req = iotjs_adc_reqwrap_req(req_wrap);                          \
    uv_queue_work(loop, req, iotjs_adc_##call##_worker, iotjs_adc_after_work); \
  } while (0)


JHANDLER_FUNCTION(AdcConstructor) {
  JHANDLER_CHECK_THIS(object);
  JHANDLER_CHECK_ARGS(2, object, function);

  // Create ADC object
  const iotjs_jval_t* jadc = JHANDLER_GET_THIS(object);
  iotjs_adc_t* adc = iotjs_adc_create(jadc);
  IOTJS_ASSERT(adc == iotjs_adc_instance_from_jval(jadc));

  iotjs_adc_set_configuration(adc, JHANDLER_GET_ARG(0, object));

  const iotjs_jval_t* jcallback = JHANDLER_GET_ARG(1, function);
  ADC_ASYNC(open, jadc, jcallback, kAdcOpOpen);
}


JHANDLER_FUNCTION(Read) {
  JHANDLER_CHECK_THIS(object);
  JHANDLER_CHECK_ARG_IF_EXIST(0, function);

  const iotjs_jval_t* jcallback = JHANDLER_GET_ARG_IF_EXIST(0, function);
  const iotjs_jval_t* jadc = JHANDLER_GET_THIS(object);
  iotjs_adc_t* adc = iotjs_adc_instance_from_jval(jadc);

  if (jcallback) {
    ADC_ASYNC(read, jadc, jcallback, kAdcOpRead);
  } else {
    int32_t value = iotjs_adc_read(adc);
    if (value < 0) {
      JHANDLER_THROW(COMMON, "ADC Read Error");
    } else {
      iotjs_jhandler_return_number(jhandler, value);
    }
  }
}


JHANDLER_FUNCTION(Close) {
  JHANDLER_CHECK_THIS(object);
  JHANDLER_CHECK_ARG_IF_EXIST(0, function);

  const iotjs_jval_t* jcallback = JHANDLER_GET_ARG_IF_EXIST(0, function);
  const iotjs_jval_t* jadc = JHANDLER_GET_THIS(object);
  iotjs_adc_t* adc = iotjs_adc_instance_from_jval(jadc);

  if (jcallback) {
    ADC_ASYNC(close, jadc, jcallback, kAdcOpClose);
  } else {
    if (!iotjs_adc_close(adc)) {
      JHANDLER_THROW(COMMON, "ADC Close Error");
    }
  }

  iotjs_jhandler_return_null(jhandler);
}


iotjs_jval_t InitAdc() {
  iotjs_jval_t jadc = iotjs_jval_create_object();
  iotjs_jval_t jadcConstructor =
      iotjs_jval_create_function_with_dispatch(AdcConstructor);
  iotjs_jval_set_property_jval(&jadc, IOTJS_MAGIC_STRING_ADC, &jadcConstructor);

  iotjs_jval_t jprototype = iotjs_jval_create_object();
  iotjs_jval_set_method(&jprototype, IOTJS_MAGIC_STRING_READ, Read);
  iotjs_jval_set_method(&jprototype, IOTJS_MAGIC_STRING_CLOSE, Close);
  iotjs_jval_set_property_jval(&jadcConstructor, IOTJS_MAGIC_STRING_PROTOTYPE,
                               &jprototype);

  iotjs_jval_destroy(&jprototype);
  iotjs_jval_destroy(&jadcConstructor);

  return jadc;
}
