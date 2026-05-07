export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success?: boolean;
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    message: string;
    token: string;
}

export interface SignUpRequest {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
}

export interface SignUpResponse { 
    success: boolean;
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    message: string;
    token: string;
}


