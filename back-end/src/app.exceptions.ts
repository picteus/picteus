export class ControllerError extends Error
{

    public readonly httpStatus: number;

    public readonly code: number;

    constructor(message: string, httpStatus: number, code: number)
    {
        super(message);
        this.httpStatus = httpStatus;
        this.code = code;
    }

}

export class ServiceError extends Error
{

    public readonly httpStatus: number;

    public readonly code: number;

    constructor(message: string, httpStatus: number, code: number)
    {
        super(message);
        this.httpStatus = httpStatus;
        this.code = code;
    }

}
