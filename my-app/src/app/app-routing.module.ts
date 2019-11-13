import { NgModule } from '@angular/core';
import { ExtraOptions, NoPreloading, RouterModule, Routes } from '@angular/router';

export const ROUTERCONFIG: ExtraOptions = { useHash: false, preloadingStrategy: NoPreloading };


const routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes, ROUTERCONFIG)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
