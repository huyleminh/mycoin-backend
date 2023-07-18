import { BaseResponse } from "./base.response";

export class DataResponse extends BaseResponse {
    constructor(data: any, message = "OK") {
        super(200, 200, message, data);
    }
}

export class CreatedResponse extends BaseResponse {
    constructor(data?: any, message = "Created") {
        super(201, 201, message, data);
    }
}
