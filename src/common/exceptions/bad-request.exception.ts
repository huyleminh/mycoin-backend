import { BaseException } from "../../core/exceptions";

export class BadRequestException extends BaseException {
    /**
     *
     * @param responseCode Custom response code for specific error situation
     * @param message Client readable message
     */
    constructor(responseCode: number, message = "Bad Request") {
        super(400, message, responseCode);
    }
}
