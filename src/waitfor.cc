#include <v8.h>
#include <node.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <errno.h>

using namespace v8;
using namespace node;

static void Waitfor(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);
  int child, status;

  if (args[0]->IsInt32()) {
    child = args[0]->Int32Value();

    while (waitpid(child, &status, 0) == -1) {
      if (errno != EINTR) {
        perror("waitpid");
        exit(1);
      }
    }

    Local<Object> result = Object::New(isolate);

    if (WIFEXITED(status)) {
      result->Set(String::NewFromUtf8(isolate, "exitCode"), Integer::New(isolate, WEXITSTATUS(status)));
      result->Set(String::NewFromUtf8(isolate, "signalCode"), Null(isolate));
      args.GetReturnValue().Set(result);
      return;
    }
    else if (WIFSIGNALED(status)) {
      result->Set(String::NewFromUtf8(isolate, "exitCode"), Null(isolate));
      result->Set(String::NewFromUtf8(isolate, "signalCode"), Integer::New(isolate, WTERMSIG(status)));
      args.GetReturnValue().Set(result);
      return;
    }
    args.GetReturnValue().Set(Undefined(isolate));
    return;
  }
  else {
    isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Not an integer.")));
    return;
  }
}


extern "C" void init(Handle<Object> target) {
  HandleScope scope(Isolate::GetCurrent());
  NODE_SET_METHOD(target, "waitfor", Waitfor);
}


NODE_MODULE(waitfor, init)
