import { Injectable, OnDestroy } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';

declare const io: { connect: any };
let init = false;
let logoutState = false;

@Injectable()
export class SessionService implements OnDestroy {

    static instance: SessionService = null;
    static _initialized = false;

    // for timestamp query
    static _lastCalls: any = {};

    // Observable string sources
    static _contextSource = new Subject<Object>();
    static _sessionSource = new ReplaySubject<Object>();
    static _resetSource = new Subject<Object>();
    static _connectionSource = new ReplaySubject<Object>();
    static _connectionStatusSource = new ReplaySubject<Object>();
    static _timeoutSource = new ReplaySubject<number>();
    // Observable string streams

    static _state = {
        authenticated: false
    };

    static _connection = {
        status: 'disconnected',
        lastConnected: null
    };


    static _stateChanged = true;
    static _socket = null;
    static _idCounter = 0;
    static _callbacks = {};
    static _contextCallbacks = [];
    static _connectionCallbacks = [];
    static _context = null;
    static _connectionStatus = false;
    static _timeoutCounter = -1;
    static _lastTimeout = -1;

    static pushSessionState() {
        // console.log('pushState stateChanged', SessionService._stateChanged);
        if (SessionService._stateChanged) {
            SessionService._sessionSource.next({
                state: SessionService._state,
                context: SessionService._context
            });
            SessionService._contextSource.next({
                state: SessionService._state,
                context: SessionService._context
            });
        }
        SessionService._stateChanged = false;
    }

    static pushConnectionState() {
        SessionService._connectionSource.next(SessionService._connection);
    }

    static pushConnectionStatus() {
        SessionService._connectionStatusSource.next(SessionService._connection.status);
    }

    static pushConnectionTimeout() {
        // console.log(SessionService._timeoutCounter);
        SessionService._timeoutSource.next(SessionService._timeoutCounter);
    }

    static setContext(context) {
        if (JSON.stringify(context) !== JSON.stringify(SessionService._context)) {
            // console.log('bin ich context?');
            SessionService._context = context;
            SessionService._stateChanged = true;
        }
        SessionService.pushSessionState();
    }

    constructor(
        // private _authService: AuthService
    ) {
        if (SessionService._initialized) {
            return SessionService.instance;
        }
        SessionService._initialized = true;
        this.init();
        SessionService.instance = this;
    }


    init() {
        const self = this;
        this.listenGlobalClicks();
        this.initTimoutCounter();
        SessionService._socket = io.connect('/', {
            forceNew: false,
            reconnection: true,
            timeout: 1000,
            transports: [ 'websocket', 'polling' ],
            requestTimeout: 1000
        }); // , { 'force new connection': true }); // Sascha: http://10.20.10.222/
        SessionService._socket.once('connect', () => {
            // console.log('connected');
            SessionService._connection.status = 'connected';
            SessionService.pushConnectionState();
            // SessionService.pushSessionState();

            SessionService._socket.on('error', (err) => {
                console.log('socket.IO Error');
                SessionService._connection.status = 'error';
                SessionService.pushConnectionState();
                SessionService.pushConnectionStatus();
                // todo: show connection lost hint
                // console.error(err.stack);
                // SessionService is changed from your code in last comment
            });

            SessionService._socket.on('disconnect', (err) => {
                SessionService._connection.lastConnected = new Date();
                console.log('disconnected');

                SessionService._connection.status = 'disconnected';
                SessionService.pushConnectionState();
                SessionService.pushConnectionStatus();
                // console.log(err.stack);
                // this is changed from your code in last comment
            });
            SessionService._socket.on('reconnect', () => {

                // console.log('reconnected');
                SessionService._connection.status = 'connected';
                SessionService.pushConnectionStatus();
                this.emit('sys', 'usr', 'start', null, (context) => {
                    // console.log('START???')
                    // this.setContext(context);
                    // console.log('usr start', context);
                    this.triggerContext(context.data);
                });
            });

            // this.on('sys', 'cb', 'call', (data, cb) => {
            //     // console.log('sys', data);
            //     if (typeof SessionService._callbacks[ 'cb' + cb ] === 'function') {

            //         // console.log(SessionService._callbacks['cb' + cb])


            //         SessionService._callbacks[ 'cb' + cb ](data);
            //         // this._callbacks['cb'+cb] = null;
            //     }
            // });

            this.on('api', 'cb', 'call', (data, cb) => {
                // console.log('api', data);
                if (typeof SessionService._callbacks[ 'cb' + cb ] === 'function') {
                    SessionService._callbacks[ 'cb' + cb ](data);
                    // this._callbacks['cb'+cb] = null;
                }
            });
            this.on('sys', 'cb', 'call', (data, cb) => {
                // console.log('api', data);
                if (typeof SessionService._callbacks[ 'cb' + cb ] === 'function') {
                    SessionService._callbacks[ 'cb' + cb ](data);
                    // this._callbacks['cb'+cb] = null;
                }
            });

            this.on('sys', 'usr', 'refresh', (context) => {
                // this.setContext(context);
                // console.log('usr start', context);
                // console.log('REFRESH???')
                this.triggerContext(context.data);
            });

            this.on('sys', 'usr', 'timeout', (result) => {
                if (result.status === 'success') {
                    SessionService._timeoutCounter = result.timeout || -1;
                    if (SessionService._timeoutCounter === -1) {
                        SessionService._lastTimeout = -1;
                        SessionService.pushConnectionTimeout();
                    }
                }
            });

            this.emit('sys', 'usr', 'start', null, (context) => {
                // console.log('START???')
                // this.setContext(context);
                // console.log('usr start', context);
                this.triggerContext(context.data);
            });


            this.on('sys', 'usr', 'logout', (context) => {
                this.triggerContext(context.data);
                logoutState = true;
                SessionService._timeoutCounter = -1;
                SessionService._lastTimeout = -1;

            });

            // session reset
            this.on('api', 'AccountModule', 'resetSession', _ => {
                // console.log('session reset');
                SessionService._resetSource.next(null);
            });

            // this.on('sys', 'usr', 'login', (context) => {
            //     this.triggerContext(context.data);
            // });
        });

        /*setInterval(() => {
         this.emit('sys', 'usr', 'refresh', null, (context) => {
         // this.setContext(context);
         // console.log('usr start', context);
         this.triggerContext(context);
         });
         }, 5000);*/

    }

    initTimoutCounter() {
        setInterval(() => {
            if (SessionService._lastTimeout !== SessionService._timeoutCounter) {
                SessionService.pushConnectionTimeout();
            }
            SessionService._lastTimeout = SessionService._timeoutCounter;
            if (SessionService._timeoutCounter > 0) {
                SessionService._timeoutCounter -= 1;
            }

        }, 1000);
    }

    listenGlobalClicks() {
        if (typeof window !== 'undefined') {
            window.document.addEventListener('click', () => {
                this.emit('sys', 'usr', 'refresh', null);
            });
        }
    }

    getConnectionTimeout() {
        return SessionService._timeoutCounter;
    }

    getTimoutEvent() {
        // console.log('getTimeoutEvent');
        return SessionService._timeoutSource.asObservable();
    }

    getSocket() {
        return SessionService._socket;
    }

    emit(channel, module, action, data, callback?) {
        if (channel === 'sys' && module === 'usr' && action === 'login') {
            logoutState = false;
        }
        const msg = {
            m: module,
            a: action,
            d: data,
            cb: null
        };

        if (typeof callback === 'function') {
            SessionService._idCounter++;

            SessionService._callbacks[ 'cb' + SessionService._idCounter ] = callback;

            msg.cb = SessionService._idCounter;
        }
        SessionService._socket.emit(channel, msg);
    }

    on(channel, module, action, callback) {
        // console.log('on', channel, module, action);
        SessionService._lastCalls[ `${channel}${module}${action}` ] = null;
        SessionService._socket.on(channel, (data) => {
            if (module === data.m && action === data.a) {
                // console.log('trigger', channel, module, action, data.d ? data.d.serverTime : data);
                if (data.m === 'usr' && data.a === 'timeout' && init === false) {
                    this.emit('sys', 'usr', 'refresh', null);
                    init = true;
                    return;
                }
                if (SessionService._lastCalls[ `${channel}${module}${action}` ] === null) {
                    SessionService._lastCalls[ `${channel}${module}${action}` ] = Date.parse(data.d.serverTime);
                    callback(data.d, data.cb);
                } else if (SessionService._lastCalls[ `${channel}${module}${action}` ] <= Date.parse(data.d.serverTime)) {
                    SessionService._lastCalls[ `${channel}${module}${action}` ] = Date.parse(data.d.serverTime);
                    callback(data.d, data.cb);
                } else if (data.d === null) {
                    callback(data.d, data.cb);
                    // console.log(SessionService._lastCalls[ `${channel}${module}${action}` ] + '>' + Date.parse(data.d ? data.d.serverTime : data));
                }
            }
        });
        return callback;
    }

    triggerContext(context) {
        const auth = SessionService._state.authenticated;
        if (context.user.name !== 'anonymous' && logoutState) {
            logoutState = false;
            return;
        }
        if (context.user.name !== 'anonymous') {
            SessionService._state.authenticated = true;
        } else {
            SessionService._state.authenticated = false;
        }
        if (SessionService._state.authenticated === false) {
            // this._modalService.destroyAll();
        }
        if (auth !== SessionService._state.authenticated) {
            SessionService._stateChanged = true;
        }
        SessionService.setContext(context);
        for (const cb in SessionService._contextCallbacks) {
            if (SessionService._contextCallbacks.hasOwnProperty(cb)) {
                try {
                    SessionService._contextCallbacks[ cb ](context);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }


    triggerConnectionStatus() {
        for (const cb in SessionService._connectionCallbacks) {
            if (SessionService._contextCallbacks.hasOwnProperty(cb)) {
                try {
                    SessionService._connectionCallbacks[ cb ](SessionService._connectionStatus);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }

    getContext() {
        return SessionService._context;
    }


    stateChanged() {
        // console.log('STATE CHANGED');
        return SessionService._sessionSource.asObservable();
    }

    sessionReset() {
        // console.log('STATE CHANGED');
        return SessionService._resetSource.asObservable();
    }

    contextChanged() {
        // console.log('STATE CHANGED');
        return SessionService._contextSource.asObservable();
    }

    connectionChanged() {
        return SessionService._connectionSource.asObservable();
    }

    connectionStatus() {
        return SessionService._connectionStatusSource.asObservable();
    }

    ngOnDestroy() {
        SessionService._socket.disconnect();
    }
}


// connectionEstablished
// connecting
// connectionAborted
// connectionRefused
// session started
// session resumed
// session ended
// session depleted
// login success
// login failed
