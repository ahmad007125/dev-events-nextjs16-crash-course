import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

import { Event } from './event.model';

export interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;

type BookingModel = Model<IBooking>;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Common filter key (e.g. list bookings by event)
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: [
        {
          validator: isNonEmptyString,
          message: 'Email is required.',
        },
        {
          validator: (value: unknown) =>
            typeof value === 'string' && isValidEmail(value),
          message: 'Email must be a valid email address.',
        },
      ],
    },
  },
  {
    timestamps: true, // Auto-manage createdAt/updatedAt
  }
);

BookingSchema.pre(
  'save',
  async function (this: BookingDocument) {
    // Ensure the referenced Event exists to prevent orphan bookings.
    if (this.isNew || this.isModified('eventId')) {
      const exists = await Event.exists({ _id: this.eventId });
      if (!exists) {
        throw new Error('Event does not exist for the provided eventId.');
      }
    }
  }
);

export const Booking: BookingModel =
  (mongoose.models.Booking as BookingModel | undefined) ||
  mongoose.model<IBooking>('Booking', BookingSchema);
