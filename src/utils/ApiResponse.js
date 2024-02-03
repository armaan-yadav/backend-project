class ApiResponse {
  constructor(message = "Success", statusCode, data) {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
