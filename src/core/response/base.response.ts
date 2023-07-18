export abstract class BaseResponse {
    constructor(protected _status: number, protected _code: number, protected _message: string, protected _data: any) {}

    toJSON() {
        return {
            code: this._code,
            message: this._message,
            data: this._data,
        };
    }
}
