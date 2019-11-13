import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';


//import 'reflect-metadata';

@Injectable()
export class EventService {
    static eventSources = {};
    public module: Function;
    public event: Function;
    public trigger: Function;
    constructor() {

    }

    register(ngComponent) {
        //console.log(ngComponent);
        ngComponent.localSubscriptions = [];
        let hookFunc = ngComponent.ngOnDestroy;

        // ngOnDestroyHook for unsubscribing all Subscriptions
        ngComponent.ngOnDestroy = () => {
            //console.log('destroy');

            for (let i in ngComponent.localSubscriptions) {
                //console.log('in loop');
                //console.log(ngComponent.localSubscriptions);
                if (ngComponent.localSubscriptions[ i ] !== undefined) {
                    //console.log('unsubscribe');
                    ngComponent.localSubscriptions[ i ].unsubscribe();
                    //ngComponent.localSubscriptions[i] = undefined;
                }
            }
            let subs = [];
            for (let i in ngComponent.localSubscriptions) {
                //console.log('in loop');
                //console.log(ngComponent.localSubscriptions);
                if (ngComponent.localSubscriptions[ i ] !== undefined) {
                    if (!ngComponent.localSubscriptions[ i ].closed) {
                        subs.push(ngComponent.localSubscriptions[ i ]);
                        //ngComponent.localSubscriptions[i] = undefined;
                    }
                }
            }


            ngComponent.localSubscriptions = subs;
            // call original ngOnDestroy-Event
            hookFunc.apply(ngComponent);
        };


        this.module = (name: string) => {
            return new EventModule(name, ngComponent);
        };

        this.event = (event: string) => {
            return new EventModule('sys', ngComponent).event(event);
        };

        this.trigger = (event: string, data: any) => {
            return new EventModule('sys', ngComponent).trigger(event, data);
        };

    }
}

class EventModule {

    constructor(
        private _name: string,
        private _service: any) {
    }

    event(event: string) {
        // check if observer-source is valid and - if not - create new global observer
        if (EventService.eventSources[ this._name + event ] === undefined) {
            //console.log('new Event', this._name , event);
            EventService.eventSources[ this._name + event ] = new ReplaySubject<Object>(1, 1000);

        }

        return this.hookSubscribe(EventService.eventSources[ this._name + event ].asObservable());
    }

    trigger(event: string, data?: any) {
        // check if observer-source is valid and - if not - create new global observer
        if (EventService.eventSources[ this._name + event ] === undefined) {
            EventService.eventSources[ this._name + event ] = new ReplaySubject<Object>(1, 1000);
        }
        //console.log('Triggered: ', EventService.eventSources);
        setTimeout(() => {
            EventService.eventSources[ this._name + event ].next(data);
        });

        return this.hookSubscribe(EventService.eventSources[ this._name + event ].asObservable());
    }

    hookSubscribe(observable) {
        let originalSubscribe = observable.subscribe;
        observable.subscribe = (...args) => {
            let subscription = originalSubscribe.apply(observable, args);
            this._service.localSubscriptions.push(subscription);
            // console.log(this._service.localSubscriptions);
            return subscription;
        };

        return observable;
    }
}

/**
 * @export
 * @param {*} [target:Component]
 * @returns
 */
export function EventSystem(annotation?: any) {



    return (target: Function): any => {

        if (target.prototype.ngOnDestroy === undefined) {
            target.prototype.ngOnDestroy = function () { };
        }

        let originalInit = target.prototype.ngOnInit;
        target.prototype.ngOnInit = function () {
            if (this._eventService) {
                this._eventService.register(this);
            }
            if (originalInit !== undefined) {
                return originalInit.apply(this);
            }
        };

        return target;
    };
}
