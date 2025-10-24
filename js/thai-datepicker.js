/**
 * Thai Date Picker
 * A simple date picker implementation for Thai Buddhist Era dates (BE)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize dayjs with Thai locale
  dayjs.locale('th');

  // Date picker configuration
  const datePickerConfig = {
    format: 'DD/MM/BBBB', // Thai Buddhist era format
    yearOffset: 543, // Offset for Buddhist era (BE = AD + 543)
    minYear: 2560, // Minimum selectable year in BE
    maxYear: 2580, // Maximum selectable year in BE
    monthNames: [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ],
    dayNames: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  };

  // Get all date picker elements
  const datePickerElements = document.querySelectorAll('.date-picker-input');

  // Initialize each date picker
  datePickerElements.forEach(element => {
    initDatePicker(element);
  });

  // Specific initialization for entry date in the modal form
  const entryDateTrigger = document.getElementById('entryDateTrigger');
  if (entryDateTrigger) {
    initDatePicker(entryDateTrigger);
  }

  // Initialize a date picker
  function initDatePicker(element) {
    const id = element.id;
    const calendarId = `calendar${id.charAt(0).toUpperCase() + id.slice(1)}`;
    const calendar = document.getElementById(calendarId);

    if (!calendar) return;

    const dateValueElement = document.getElementById(`${id}Value`);
    const hiddenDateInput = document.getElementById(id === 'entryDateTrigger' ? 'entryDate' : id);

    // Current selected date (default to today if none set)
    let currentDate = getInitialDate(dateValueElement);

    // Setup calendar
    updateCalendarUI(calendar, currentDate);

    // Open calendar on click
    element.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleCalendar(calendar);

      // Close other calendars
      const allCalendars = document.querySelectorAll('.thai-calendar');
      allCalendars.forEach(cal => {
        if (cal !== calendar && cal.style.display === 'block') {
          cal.style.display = 'none';
        }
      });
    });

    // Navigate months
    const prevButton = calendar.querySelector('.prev-month');
    const nextButton = calendar.querySelector('.next-month');

    prevButton.addEventListener('click', function() {
      currentDate = dayjs(currentDate).subtract(1, 'month');
      updateCalendarUI(calendar, currentDate);
    });

    nextButton.addEventListener('click', function() {
      currentDate = dayjs(currentDate).add(1, 'month');
      updateCalendarUI(calendar, currentDate);
    });

    // Handle "Today" button if it exists
    const todayButton = calendar.querySelector('.btn-today');
    if (todayButton) {
      todayButton.addEventListener('click', function() {
        currentDate = dayjs();
        updateCalendarUI(calendar, currentDate);
        selectDate(dayjs(), calendar, dateValueElement, hiddenDateInput);
        calendar.style.display = 'none';
      });
    }

    // Close calendar when clicking elsewhere
    document.addEventListener('click', function(e) {
      if (!calendar.contains(e.target) && e.target !== element) {
        calendar.style.display = 'none';
      }
    });
  }

  // Toggle calendar visibility
  function toggleCalendar(calendar) {
    calendar.style.display = calendar.style.display === 'block' ? 'none' : 'block';

    // If opening calendar, ensure it's within viewport
    if (calendar.style.display === 'block') {
      ensureCalendarInViewport(calendar);
    }
  }

  // Ensure calendar stays within viewport
  function ensureCalendarInViewport(calendar) {
    const rect = calendar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      calendar.style.left = `${viewportWidth - rect.width - 10}px`;
    }

    if (rect.bottom > viewportHeight) {
      calendar.style.top = `${-rect.height - 10}px`;
    }
  }

  // Get initial date from element or use today
  function getInitialDate(dateValueElement) {
    if (dateValueElement && dateValueElement.textContent) {
      // Parse from DD/MM/YYYY(BE) format
      const parts = dateValueElement.textContent.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-based month
        const yearBE = parseInt(parts[2], 10);
        const yearAD = yearBE - datePickerConfig.yearOffset;
        return dayjs(new Date(yearAD, month, day));
      }
    }
    return dayjs(); // Default to today
  }

  // Update calendar UI based on current date
  function updateCalendarUI(calendar, date) {
    // Update month and year display
    const monthName = calendar.querySelector('.month-name');
    const yearValue = calendar.querySelector('.year-value');

    monthName.textContent = datePickerConfig.monthNames[date.month()];
    yearValue.textContent = date.year() + datePickerConfig.yearOffset; // Convert to BE

    // Update calendar dates
    const calendarDates = calendar.querySelector('.calendar-dates');
    calendarDates.innerHTML = '';

    // Get dates for current month view
    const firstDayOfMonth = date.startOf('month');
    const lastDayOfMonth = date.endOf('month');
    const daysInMonth = lastDayOfMonth.date();

    // Calculate the first displayed date (might be from previous month)
    // In Thailand, week starts on Sunday (0)
    const firstDayOfCalendar = firstDayOfMonth.day() === 0 ?
      firstDayOfMonth :
      firstDayOfMonth.subtract(firstDayOfMonth.day(), 'day');

    // Generate 42 dates (6 weeks)
    const today = dayjs();
    for (let i = 0; i < 42; i++) {
      const currentDate = firstDayOfCalendar.add(i, 'day');
      const isCurrentMonth = currentDate.month() === date.month();

      const dateCell = document.createElement('div');
      dateCell.className = 'date-cell' +
        (isCurrentMonth ? '' : ' disabled') +
        (currentDate.isSame(today, 'day') ? ' today' : '') +
        (currentDate.isSame(date, 'day') && isCurrentMonth ? ' selected' : '');

      dateCell.textContent = currentDate.date();

      if (isCurrentMonth) {
        dateCell.addEventListener('click', function() {
          const dateValueElement = calendar.closest('.date-picker-container').querySelector('[id$="Value"]');
          const hiddenDateInput = calendar.closest('.date-picker-container').querySelector('input[type="hidden"]');

          selectDate(currentDate, calendar, dateValueElement, hiddenDateInput);
          calendar.style.display = 'none';
        });
      }

      calendarDates.appendChild(dateCell);
    }
  }

  // Select a date and update display
  function selectDate(date, calendar, valueElement, hiddenInput) {
    // Format date to Thai format (DD/MM/BBBB)
    const formattedDate = date.format('DD/MM/') + (date.year() + datePickerConfig.yearOffset);

    // Update displayed value
    valueElement.textContent = formattedDate;

    // If there's a hidden input, update its value (in ISO format)
    if (hiddenInput) {
      hiddenInput.value = date.format('YYYY-MM-DD');
    }

    // If this is part of a date range, ensure From-To range is valid
    if (valueElement.id === 'dateFromValue' || valueElement.id === 'dateToValue') {
      validateDateRange();
    }

    // Dispatch a change event
    const event = new Event('change', { bubbles: true });
    valueElement.dispatchEvent(event);
  }

  // Validate that the From date is not after the To date
  function validateDateRange() {
    const fromValueElement = document.getElementById('dateFromValue');
    const toValueElement = document.getElementById('dateToValue');

    if (!fromValueElement || !toValueElement) return;

    const fromDate = parseDateFromDisplay(fromValueElement.textContent);
    const toDate = parseDateFromDisplay(toValueElement.textContent);

    if (fromDate && toDate && fromDate.isAfter(toDate)) {
      // If from date is after to date, set to date to from date
      toValueElement.textContent = fromValueElement.textContent;

      // Also update hidden input if it exists
      const toDateInput = document.getElementById('dateTo');
      if (toDateInput) {
        toDateInput.value = fromDate.format('YYYY-MM-DD');
      }
    }
  }

  // Parse a date from the displayed format (DD/MM/BBBB)
  function parseDateFromDisplay(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based month
      const yearBE = parseInt(parts[2], 10);
      const yearAD = yearBE - datePickerConfig.yearOffset;
      return dayjs(new Date(yearAD, month, day));
    }
    return null;
  }
});
