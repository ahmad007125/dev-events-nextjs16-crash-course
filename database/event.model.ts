import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as ISO-8601 date (YYYY-MM-DD)
  time: string; // Stored as 24h time (HH:mm)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<IEvent>;

type EventModel = Model<IEvent>;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

const slugify = (input: string): string => {
  // URL-friendly slug generation: lowercase, hyphenate, and trim.
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('Unable to generate slug from title.');
  }

  return slug;
};

const normalizeIsoDate = (raw: string): string => {
  // Normalize to an ISO-8601 date-only string (YYYY-MM-DD).
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format.');
  }

  return parsed.toISOString().slice(0, 10);
};

const normalizeTime24h = (raw: string): string => {
  // Normalize common inputs (e.g. "9", "9am", "9:30 PM", "21:30") into HH:mm.
  const value = raw.trim().toLowerCase();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(value);

  if (!match) {
    throw new Error('Invalid time format.');
  }

  const hourRaw = Number(match[1]);
  const minuteRaw = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] ?? null;

  if (!Number.isInteger(hourRaw) || !Number.isInteger(minuteRaw)) {
    throw new Error('Invalid time format.');
  }

  if (minuteRaw < 0 || minuteRaw > 59) {
    throw new Error('Invalid minutes value.');
  }

  let hours = hourRaw;
  if (meridiem) {
    if (hours < 1 || hours > 12) {
      throw new Error('Invalid hour value for 12-hour time.');
    }
    if (meridiem === 'am') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else {
    if (hours < 0 || hours > 23) {
      throw new Error('Invalid hour value for 24-hour time.');
    }
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minuteRaw).padStart(2, '0');
  return `${hh}:${mm}`;
};

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Title is required.',
      },
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Slug must be a non-empty string.',
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Description is required.',
      },
    },
    overview: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Overview is required.',
      },
    },
    image: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Image is required.',
      },
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Venue is required.',
      },
    },
    location: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Location is required.',
      },
    },
    date: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Date is required.',
      },
    },
    time: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Time is required.',
      },
    },
    mode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Mode is required.',
      },
    },
    audience: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Audience is required.',
      },
    },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: isNonEmptyStringArray,
        message: 'Agenda must contain at least one item.',
      },
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Organizer is required.',
      },
    },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: isNonEmptyStringArray,
        message: 'Tags must contain at least one item.',
      },
    },
  },
  {
    timestamps: true, // Auto-manage createdAt/updatedAt
  }
);

EventSchema.index({ slug: 1 }, { unique: true });

EventSchema.pre('save', function (this: EventDocument) {
  // Slug is derived from title and only regenerated when title changes.
  if (!this.slug || this.isModified('title')) {
    this.slug = slugify(this.title);
  }

  // Normalize and validate date/time into consistent storage formats.
  if (this.isModified('date') || this.isNew) {
    this.date = normalizeIsoDate(this.date);
  }
  if (this.isModified('time') || this.isNew) {
    this.time = normalizeTime24h(this.time);
  }
});

export const Event: EventModel =
  (mongoose.models.Event as EventModel | undefined) ||
  mongoose.model<IEvent>('Event', EventSchema);
