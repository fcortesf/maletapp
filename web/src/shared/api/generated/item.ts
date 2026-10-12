export interface paths {
    "/baggages/{baggageId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List items in a specific baggage */
        get: operations["listItemsByBaggage"];
        put?: never;
        /** Create a new item inside a specific baggage */
        post: operations["createItemInBaggage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/trips/{tripId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List items for a specific trip */
        get: operations["listItemsByTrip"];
        put?: never;
        /**
         * Create a new item directly under a trip
         * @description Internally, the item will be assigned to a default baggage for this trip
         */
        post: operations["createItemInTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get an item by ID */
        get: operations["getItem"];
        put?: never;
        post?: never;
        /** Delete an item owned by the current user */
        delete: operations["deleteItem"];
        options?: never;
        head?: never;
        /** Partially update item (e.g., rename it or update packed state) */
        patch: operations["patchItem"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        NewItem: {
            /**
             * @description Non-null lowercase code. Creation omission defaults to other; PATCH omission preserves. Null or invalid codes return 400 problem details without partial mutation.
             * @default other
             * @enum {string}
             */
            category?: "documents" | "clothing" | "toiletries" | "electronics" | "health" | "accessories" | "other";
            /** @description Free-text comments or packing instructions for this item; null means unspecified */
            notes?: string | null;
            /**
             * Format: int32
             * @description Number of units to bring; null means unspecified, not zero or one
             */
            itemCount?: number | null;
            /** @description The name of the item */
            name: string;
            /**
             * Format: uuid
             * @description Optional reference to a predefined item from another API
             */
            defaultItemId?: string;
        };
        PatchItem: {
            /**
             * @description Non-null lowercase code. Creation omission defaults to other; PATCH omission preserves. Null or invalid codes return 400 problem details without partial mutation.
             * @enum {string}
             */
            category?: "documents" | "clothing" | "toiletries" | "electronics" | "health" | "accessories" | "other";
            /** @description Free-text comments or packing instructions for this item; null means unspecified */
            notes?: string | null;
            /**
             * Format: int32
             * @description Number of units to bring; null means unspecified, not zero or one
             */
            itemCount?: number | null;
            /** @description The name of the item */
            name?: string;
            /**
             * Format: uuid
             * @description Optional reference to a predefined item from another API
             */
            defaultItemId?: string;
            /** @description Whether the item is already packed */
            isPacked?: boolean;
        };
        Item: {
            /**
             * @description Non-null lowercase code. Creation omission defaults to other; PATCH omission preserves. Null or invalid codes return 400 problem details without partial mutation.
             * @enum {string}
             */
            category: "documents" | "clothing" | "toiletries" | "electronics" | "health" | "accessories" | "other";
            /**
             * Format: uuid
             * @description The unique identifier for the item
             */
            readonly id: string;
            /**
             * Format: uuid
             * @description The unique identifier for the trip
             */
            readonly tripId?: string;
            /**
             * Format: uuid
             * @description The unique identifier for the baggage
             */
            readonly baggageId?: string;
            /** @description Free-text comments or packing instructions for this item; null means unspecified */
            notes?: string | null;
            /**
             * Format: int32
             * @description Number of units to bring; null means unspecified, not zero or one
             */
            itemCount?: number | null;
            /** @description The name of the item */
            name: string;
            /** @description Whether the item is already packed */
            readonly isPacked: boolean;
            /**
             * Format: uuid
             * @description Optional reference to a predefined item from another API
             */
            defaultItemId?: string;
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
    listItemsByBaggage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the baggage */
                baggageId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"][];
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
            /** @description Not Found */
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
    createItemInBaggage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the baggage */
                baggageId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewItem"];
            };
        };
        responses: {
            /** @description Item created successfully */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
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
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
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
    listItemsByTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the trip */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"][];
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
            /** @description Not Found */
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
    createItemInTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the trip */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewItem"];
            };
        };
        responses: {
            /** @description Item created successfully */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
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
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
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
    getItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the item */
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Item found */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
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
            /** @description Not Found */
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
    deleteItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Item deleted; trip, baggage and other items preserved */
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
            /** @description Item not found */
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
    patchItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The unique identifier of the item */
                itemId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PatchItem"];
            };
        };
        responses: {
            /** @description Item updated successfully */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Item"];
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
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
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
