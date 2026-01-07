import dayjs from 'dayjs'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

const currentYear = dayjs()

export default function DatePickerYearsOrder() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Years in descending order (including day selection)"
        maxDate={currentYear}
        openTo="year"
        // Zaktualizowano widoki, aby umożliwić wybór roku, miesiąca i dnia.
        views={['year', 'month', 'day']}
        yearsOrder="desc"
        sx={{ minWidth: 250 }}
      />
    </LocalizationProvider>
  )
}