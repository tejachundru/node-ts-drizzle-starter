export class ResponseData<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;

  constructor(success: boolean, message: string, data?: T, error?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static success<T>(data: T, message: string = "Success"): ResponseData<T> {
    return new ResponseData(true, message, data);
  }

  static error(message: string = "Error occurred", error?: any): ResponseData {
    return new ResponseData(false, message, undefined, error);
  }
}
