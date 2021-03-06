import { Action, ClientContext, QueryError, QueryResponse } from 'react-fetching-library';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ClientContextType } from 'react-fetching-library/lib/context/clientContext/clientContext.types';

type ActionCreator<S, R> = (action: S) => Action<R>;
type ResponsesType<T> = (QueryResponse<T> | undefined)[];

type UseBulkMutationResponse<S, T> =  {
    abort: () => void;
    loading: boolean;
    mutate: (actions: S[]) => Promise<ResponsesType<T>>;
    reset: () => void;
    responses: ResponsesType<T>;
};

type UseBulkMutationState<T> = {
    responses: (QueryResponse<T> | undefined)[];
    loading: boolean;
}

export const useBulkMutation = <T = any, R = {}, S = any>(
    actionCreator: ActionCreator<S, R>
): UseBulkMutationResponse<S, T> => {
    const { query } = useContext<ClientContextType>(ClientContext);
    const isMounted = useRef(true);
    const controller = useRef<AbortController | null>();

    const [ state, setState ] = useState<UseBulkMutationState<T>>({
        loading: false,
        responses: []
    });

    const handleAbort = useCallback(() => {
        if (controller.current) {
            controller.current.abort();
        }
    }, [ controller ]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            handleAbort();
        };
    }, [ handleAbort ]);

    const handleQuery = useCallback(
        async (actionParams: S[]) => {
            if (!isMounted.current) {
                return Array(actionParams.length).map(() => ({
                    error: false
                }));
            }

            const abortController = 'AbortController' in window ? new AbortController() : undefined;
            const actions = actionParams.map(param => actionCreator(param));
            const signal = abortController ? abortController.signal : undefined;
            actions.forEach(action => action.signal = action.signal || signal);

            if (controller.current) {
                controller.current.abort();
            }

            controller.current = abortController;

            setState(prevState => ({
                ...prevState,
                loading: true
            }));

            const queryResponses: QueryResponse<T>[] = await Promise.all(actions.map(action => query<T>(action)).map(p => p.catch((e => e))));

            if (isMounted.current) {
                setState({
                    loading: false,
                    responses: queryResponses.map((response, index) => {
                        if (response.errorObject && response.errorObject.name === 'AbortError') {
                            return undefined;
                        }

                        if (actions[index].signal === signal && controller.current === abortController) {
                            controller.current = undefined;
                            setState(prevState => ({
                                ...prevState,
                                loading: false
                            }));
                        }

                        return response;
                    })
                });
            }

            return queryResponses;
        },
        [ query, actionCreator ]
    );

    const handleReset = useCallback(() => {
        setState({
            loading: false,
            responses: []
        });
    }, [ setState ]);

    state.responses.forEach(response => {
        if (response?.errorObject && (response.errorObject instanceof QueryError)) {
            throw response.errorObject;
        }
    });

    return {
        abort: handleAbort,
        loading: state.loading,
        mutate: handleQuery,
        reset: handleReset,
        responses: state.responses
    };
};
