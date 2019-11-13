import { Location } from '@angular/common';
import { EventEmitter, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { SessionService } from '../session/session.service';

@Injectable()
export class AuthService {
    initialized: Boolean = false;
    authenticated: boolean = false;
    listener: Function[] = [];
    connected = null;
    url: string = '';

    public onAuth = new EventEmitter<Boolean>();
    public onConnection = new EventEmitter<Boolean>();

    constructor(private _router: Router,
        private _location: Location) {

        SessionService._sessionSource.asObservable().subscribe(
            (state) => {
                this.onStateChanged(state);
            });
        this.url = _router.url;
    }

    onStateChanged(info) {

        this.checkAuth(info[ 'state' ].authenticated);
        while (this.listener.length > 0) {
            this.listener.pop()(this.authenticated);
        }

    }

    checkAuth(isAuth) {
        // if (!this.initialized) {
        //     this.url = this._location.path();
        //     console.log(this.url);
        // }
        // if (this.authenticated === isAuth && isAuth === true) {
        //     return;
        // }
        // this.initialized = true;
        //
        // if (this._router.url === this.url && this._router.url === '/login') {
        //
        //     if (this.url === '/login') {
        //         this._router.navigateByUrl('/');
        //     }
        // } else {
        //     if (this._location.path() === '/login/passwort-vergessen') {
        //         this._router.navigateByUrl(this._location.path());
        //     } else {
        //         console.log(this.url);
        //         this._router.navigateByUrl(this.url);
        //     }
        // }
        //
        // if (!isAuth && this._location.path().indexOf('/register') === 0) {
        //
        //    // this._router.navigateByUrl('/register');
        // } else if (!isAuth && this._router.url.indexOf('/login') === -1) {
        //     this._router.navigateByUrl('/login');
        // }

        this.initialized = true;
        if (isAuth) {
            if (this._router.url === '/login') {
                this._router.navigateByUrl('/');
            }
        } else {
            if (this._location.path().indexOf('/register') === 0 || this._location.path().indexOf('/neues-passwort') === 0) {

            } else if (this._router.url.indexOf('/login') === -1) {
                this._router.navigateByUrl('/login');
            }
        }


        this.authenticated = isAuth;
        this.onAuth.next(isAuth);

    }

    isAuth(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.initialized) {
                resolve(this.authenticated);
            } else {
                this.listener.push(resolve);
            }
        });
    }


    isConnected() {
        return this.connected;
    }


}

