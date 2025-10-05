"""
Moduł dialogów i okien pomocniczych
Zawiera komponenty dialogów używanych w aplikacji
"""
from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, 
                             QPushButton, QCalendarWidget)
from PyQt5.QtCore import Qt
from src.styl.motyw_kolorow import ModernTheme, get_button_style

class DatePickerDialog(QDialog):
    """Dialog wyboru daty"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Wybierz datę")
        self.setModal(True)
        self.setFixedSize(300, 250)
        
        layout = QVBoxLayout(self)
        
        # Kalendarz
        self.calendar = QCalendarWidget()
        self.calendar.setGridVisible(True)
        layout.addWidget(self.calendar)
        
        # Przyciski
        btn_layout = QHBoxLayout()
        
        ok_btn = QPushButton("OK")
        ok_btn.clicked.connect(self.accept)
        ok_btn.setStyleSheet(get_button_style(ModernTheme.SUCCESS))
        
        cancel_btn = QPushButton("Anuluj")
        cancel_btn.clicked.connect(self.reject)
        cancel_btn.setStyleSheet(get_button_style(ModernTheme.ERROR))
        
        btn_layout.addWidget(ok_btn)
        btn_layout.addWidget(cancel_btn)
        layout.addLayout(btn_layout)
    
    def get_selected_date(self):
        return self.calendar.selectedDate()
