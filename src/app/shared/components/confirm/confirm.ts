import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm';

@Component({
  selector: 'app-confirm',
  imports: [],
  templateUrl: './confirm.html',
  styleUrl: './confirm.css',
})
export class Confirm {
  confirmService = inject(ConfirmService);
}
