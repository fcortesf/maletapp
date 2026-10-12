export interface paths {
    "/trips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a list of the user trips */
        get: operations["getTrips"];
        put?: never;
        /** Create a new trip for the user */
        post: operations["createTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/trips/{tripId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a trip by ID */
        get: operations["getTripById"];
        put?: never;
        post?: never;
        /** Delete a trip by ID */
        delete: operations["deleteTrip"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/trips/{tripId}/finish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Finish an owned trip
         * @description Bodyless idempotent desired-state command; preserves dates and items, including empty and incomplete trips.
         */
        post: operations["finishTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/trips/{tripId}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reopen an owned trip
         * @description Bodyless idempotent desired-state command; preserves dates and items, including empty and incomplete trips.
         */
        post: operations["reopenTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        NewTrip: WithRequired<components["schemas"]["TripProperties"], "destination">;
        Trip: WithRequired<components["schemas"]["TripProperties"], "id" | "destination" | "isFinished">;
        TripProperties: {
            /**
             * @description Explicit lifecycle state, independent of dates and packing; finished trips remain editable.
             * @default false
             */
            readonly isFinished?: boolean;
            /**
             * Format: uuid
             * @description The unique identifier for the trip
             */
            readonly id?: string;
            /** @description The destination of the trip */
            destination?: string | null;
            /**
             * Format: date
             * @description The start date of the trip
             */
            startDate?: string | null;
            /**
             * Format: date
             * @description The end date of the trip
             */
            endDate?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getTrips: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trip list retrieved successfully */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Trip"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    createTrip: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewTrip"];
            };
        };
        responses: {
            /** @description Trip created successfully */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Trip"];
                };
            };
            /** @description Bad request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getTripById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the trip to retrieve */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trip retrieved successfully */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Trip"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trip not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the trip to delete */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trip deleted successfully (no content) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trip not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    finishTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Desired state applied or already present */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Trip"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trip not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    reopenTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Desired state applied or already present */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Trip"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trip not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Internal server error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
type WithRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
